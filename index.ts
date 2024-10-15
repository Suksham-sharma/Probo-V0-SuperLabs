import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

interface INRBalances {
  [userId: string]: {
    balance: number;
    locked: number;
  };
}

interface StockBalances {
  [userId: string]: {
    [stockSymbol: string]: {
      yes: {
        quantity: number;
        locked: number;
      };
      no: {
        quantity: number;
        locked: number;
      };
    };
  };
}

interface Orderbook {
  [stockSymbol: string]: {
    yes: {
      [price: number]: {
        total: number;
        orders: {
          [userId: string]: {
            quantity: number;
            type: "minted" | "regular";
          };
        };
      };
    };
    no: {
      [price: number]: {
        total: number;
        orders: {
          [userId: string]: {
            quantity: number;
            type: "minted" | "regular";
          };
        };
      };
    };
  };
}

const INR_BALANCES: INRBalances = {
  user1: {
    balance: 300,
    locked: 0,
  },
  user2: {
    balance: 400,
    locked: 0,
  },
  user3: {
    balance: 500,
    locked: 0,
  },
  user4: {
    balance: 200,
    locked: 0,
  },
};
const STOCK_BALANCES: StockBalances = {
  user1: {
    IND_BNG: {
      yes: {
        quantity: 20,
        locked: 0,
      },
      no: {
        quantity: 10,
        locked: 0,
      },
    },
  },
};
const ORDERBOOK: Orderbook = {};

// Create a new user with default 0  balance
app.post("/user/create/:id", (req: any, res: any) => {
  const id = req.params.id;
  const userId = "user" + id;
  if (INR_BALANCES[userId]) {
    return res.status(400).json({ error: "User already exists" });
  }

  INR_BALANCES[userId] = { balance: 0, locked: 0 };
  return res.json({ message: "User created", INR_BALANCES });
});

// Create a new stock symbol with default balances
app.post("/symbol/create/:stockSymbol", (req: any, res: any) => {
  const stockSymbol = req.params.stockSymbol;
  const userId = "user1";

  for (const user in STOCK_BALANCES) {
    if (STOCK_BALANCES[user][stockSymbol]) {
      return res.status(400).json({ error: "Symbol already exists" });
    }
  }

  if (!STOCK_BALANCES[userId]) {
    STOCK_BALANCES[userId] = {};
  }

  STOCK_BALANCES[userId][stockSymbol] = {
    yes: { quantity: 0, locked: 0 },
    no: { quantity: 0, locked: 0 },
  };
  return res.json({ message: "Symbol created", STOCK_BALANCES });
});

// Get the orderbook
app.get("/orderbook", (req: any, res: any) => {
  return res.json({ ORDERBOOK });
});

// Get overall balances
app.get("/balance/inr", (req: any, res: any) => {
  return res.json({ INR_BALANCES });
});

// Get stock balances
app.get("/balance/stocks", (req: any, res: any) => {
  return res.json({ STOCK_BALANCES });
});

// Get INR balance of a user
app.get("/balance/inr/:userId", (req: any, res: any) => {
  const userId = req.params.userId;
  const balance = INR_BALANCES[userId];
  if (!balance) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ data: balance });
});

// Onramp INR into a user's balance
app.post("/onramp/inr", (req: any, res: any) => {
  const { userId, amount }: { userId: string; amount: number } = req.body;
  if (!INR_BALANCES[userId]) {
    return res.status(404).json({ error: "User not found" });
  }

  INR_BALANCES[userId].balance += amount;
  return res.json({ message: "INR onramped", balance: INR_BALANCES[userId] });
});

// Get stock balance of a user
app.get("/balance/stock/:userId", (req: any, res: any) => {
  const userId = req.params.userId;
  const stockBalance = STOCK_BALANCES[userId];
  if (!stockBalance) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ stockBalance });
});

// Yes Stock Options

// Place a buy order for 'yes' options
app.post("/order/buy", (req: any, res: any) => {
  const {
    userId,
    stockSymbol,
    quantity,
    price,
    stockOption,
  }: {
    userId: string;
    stockSymbol: string;
    quantity: number;
    price: number;
    stockOption: "yes" | "no";
  } = req.body;

  let requiredQuantity = quantity;
  const oppositeStockOption = stockOption === "yes" ? "no" : "yes";
  const correspondingPrice = 10 - price;

  if (price > 10 || price < 0) {
    return res.status(400).json({
      error: "Price should be between 0 and 10rs",
    });
  }

  if (!INR_BALANCES[userId]) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!ORDERBOOK[stockSymbol]) {
    ORDERBOOK[stockSymbol] = { yes: {}, no: {} };
  }

  if (INR_BALANCES[userId].balance < quantity * price) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  if (!STOCK_BALANCES[userId]) {
    STOCK_BALANCES[userId] = {};
  }

  if (!STOCK_BALANCES[userId][stockSymbol]) {
    STOCK_BALANCES[userId][stockSymbol] = {
      yes: { quantity: 0, locked: 0 },
      no: { quantity: 0, locked: 0 },
    };
  }

  // if total is greater than the required quantity , then we'll proceed , no need to create corrosponding sell orders
  if (
    ORDERBOOK[stockSymbol][stockOption][price] &&
    ORDERBOOK[stockSymbol][stockOption][price].total >= requiredQuantity
  ) {
    ORDERBOOK[stockSymbol][stockOption][price].total -= requiredQuantity;

    for (const sellerId in ORDERBOOK[stockSymbol][stockOption][price].orders) {
      const seller =
        ORDERBOOK[stockSymbol][stockOption][price].orders[sellerId];
      if (seller.quantity > 0) {
        const availableQuantity = Math.min(seller.quantity, requiredQuantity);

        if (seller.type === "minted") {
          // mint the required tokens
          STOCK_BALANCES[sellerId][stockSymbol][oppositeStockOption].quantity +=
            availableQuantity;
          STOCK_BALANCES[userId][stockSymbol][stockOption].quantity +=
            availableQuantity;
          INR_BALANCES[userId].balance -= availableQuantity * price;
          INR_BALANCES[sellerId].locked -=
            availableQuantity * correspondingPrice;
        } else {
          // regular (selling order)
          STOCK_BALANCES[sellerId][stockSymbol][stockOption].quantity -=
            availableQuantity;
          STOCK_BALANCES[userId][stockSymbol][stockOption].quantity +=
            availableQuantity;
          INR_BALANCES[userId].balance -= availableQuantity * price;
          INR_BALANCES[sellerId].balance += availableQuantity * price;
        }

        requiredQuantity -= availableQuantity;

        ORDERBOOK[stockSymbol][stockOption][price].orders[sellerId].quantity -=
          availableQuantity;

        if (requiredQuantity === 0) {
          break;
        }
      }
    }

    return res.json({
      message: "Successfully bought the required quantity",
      STOCK_BALANCES,
      ORDERBOOK,
      INR_BALANCES,
    });
  } else {
    // traverse through the sell orders , and swap available , and send the minting flow for the required ones .

    if (
      ORDERBOOK[stockSymbol][stockOption][price] &&
      ORDERBOOK[stockSymbol][stockOption][price].total > 0
    ) {
      for (const sellerId in ORDERBOOK[stockSymbol][stockOption][price]
        .orders) {
        const seller =
          ORDERBOOK[stockSymbol][stockOption][price].orders[sellerId];
        if (seller.quantity > 0) {
          const availableQuantity = Math.min(seller.quantity, requiredQuantity);

          if (seller.type === "minted") {
            // mint the required tokens
            STOCK_BALANCES[sellerId][stockSymbol][
              oppositeStockOption
            ].quantity += availableQuantity;
            STOCK_BALANCES[userId][stockSymbol][stockOption].quantity +=
              availableQuantity;
            INR_BALANCES[userId].balance -= availableQuantity * price;
            INR_BALANCES[sellerId].locked -=
              availableQuantity * correspondingPrice;
          } else {
            // regular (selling order)
            STOCK_BALANCES[sellerId][stockSymbol][stockOption].locked -=
              availableQuantity;
            STOCK_BALANCES[userId][stockSymbol][stockOption].quantity +=
              availableQuantity;
            INR_BALANCES[userId].balance -= availableQuantity * price;
            INR_BALANCES[sellerId].balance += availableQuantity * price;
          }

          if (seller.quantity < requiredQuantity) {
            delete ORDERBOOK[stockSymbol][stockOption][price].orders[sellerId];
          } else {
            ORDERBOOK[stockSymbol][stockOption][price].orders[
              sellerId
            ].quantity -= availableQuantity;
          }

          ORDERBOOK[stockSymbol][stockOption][price].total -= availableQuantity;

          requiredQuantity -= availableQuantity;
        }
      }
    }

    // for the remaining qty. we'll create a corresponding sell order

    if (!ORDERBOOK[stockSymbol][oppositeStockOption][correspondingPrice]) {
      ORDERBOOK[stockSymbol][oppositeStockOption][correspondingPrice] = {
        total: 0,
        orders: {},
      };
    }

    ORDERBOOK[stockSymbol][oppositeStockOption][correspondingPrice].total +=
      requiredQuantity;

    if (
      !ORDERBOOK[stockSymbol][oppositeStockOption][correspondingPrice].orders[
        userId
      ]
    ) {
      ORDERBOOK[stockSymbol][oppositeStockOption][correspondingPrice].orders[
        userId
      ] = {
        quantity: 0,
        type: "minted",
      };
    }

    ORDERBOOK[stockSymbol][oppositeStockOption][correspondingPrice].orders[
      userId
    ].quantity =
      (ORDERBOOK[stockSymbol][oppositeStockOption][correspondingPrice].orders[
        userId
      ].quantity || 0) + requiredQuantity;

    // required INR balance will be locked
    INR_BALANCES[userId].locked += requiredQuantity * price;
    INR_BALANCES[userId].balance -= requiredQuantity * price;
  }

  return res.json({ message: "Buy order placed", ORDERBOOK, INR_BALANCES });
});

// Place a sell order for 'yes' options
app.post("/order/sell", (req: any, res: any) => {
  const {
    userId,
    stockSymbol,
    quantity,
    price,
    stockOption,
  }: {
    userId: string;
    stockSymbol: string;
    quantity: number;
    price: number;
    stockOption: "yes" | "no";
  } = req.body;

  if (price > 10 || price < 0) {
    return res.status(400).json({
      error: "Price should be between 0 and 10rs",
    });
  }

  if (!INR_BALANCES[userId]) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!STOCK_BALANCES[userId]) {
    STOCK_BALANCES[userId] = {};
    return res.status(404).json({
      error: "User dosen't have the stocks , which you are trying to sell",
    });
  }
  if (
    !STOCK_BALANCES[userId][stockSymbol] ||
    STOCK_BALANCES[userId][stockSymbol][stockOption].quantity < quantity
  ) {
    return res
      .status(404)
      .json({ error: "User dosen't have the required qty." });
  }

  if (!ORDERBOOK[stockSymbol]) {
    ORDERBOOK[stockSymbol] = { yes: {}, no: {} };
  }

  if (!ORDERBOOK[stockSymbol][stockOption][price]) {
    ORDERBOOK[stockSymbol][stockOption][price] = { total: 0, orders: {} };
  }

  ORDERBOOK[stockSymbol][stockOption][price].total += quantity;

  if (!ORDERBOOK[stockSymbol][stockOption][price].orders[userId]) {
    ORDERBOOK[stockSymbol][stockOption][price].orders[userId] = {
      quantity: 0,
      type: "regular",
    };
  }
  ORDERBOOK[stockSymbol][stockOption][price].orders[userId].quantity =
    (ORDERBOOK[stockSymbol][stockOption][price].orders[userId].quantity || 0) +
    quantity;

  // lock the required quantity of stocks
  STOCK_BALANCES[userId][stockSymbol][stockOption].quantity -= quantity;
  STOCK_BALANCES[userId][stockSymbol][stockOption].locked += quantity;

  return res.json({ message: "Sell order placed", ORDERBOOK });
});

// View orderbook for a stock symbol
app.get("/orderbook/:stockSymbol", (req: any, res: any) => {
  const stockSymbol = req.params.stockSymbol;
  const orderbook = ORDERBOOK[stockSymbol];
  if (!orderbook) {
    return res.status(404).json({ error: "Symbol not found" });
  }
  return res.json({ orderbook });
});

// Server setup
app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
