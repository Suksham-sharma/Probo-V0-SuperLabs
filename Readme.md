Here’s the README formatted specifically for GitHub:

---

# Probo v0

## SuperLabs Assignment - Probo v0

Probo v0 is a basic reverse engineering project that simulates the core functionalities of the Probo platform. It uses Node.js and an Express server to handle stock options and INR balances, with a focus on reducing latency by storing data in memory.

## Technology Stack

- **Node.js**: Backend runtime environment.
- **Express.js**: Server framework.
- **CORS**: To handle cross-origin requests.

## Project Structure

```bash
├── src
│   └── index.ts        # Main server file
└── README.md           # Project documentation
```

## API Endpoints

### User Routes

- **Create a new user**: `POST /user/create/:id`
- **View INR balance for all users**: `GET /balance/inr`
- **View INR balance for a specific user**: `GET /balance/inr/:userId`

### Stock Routes

- **Create a new stock symbol**: `POST /symbol/create/:stockSymbol`
- **View stock balances for all users**: `GET /balance/stocks`
- **View stock balance for a specific user**: `GET /balance/stock/:userId`

### Orderbook Routes

- **View the entire orderbook**: `GET /orderbook`
- **View orderbook for a specific stock symbol**: `GET /orderbook/:stockSymbol`

### Trading Routes

- **Onramp INR to user balance**: `POST /onramp/inr`
- **Place a buy order**: `POST /order/buy`
- **Place a sell order**: `POST /order/sell`

## Running the Project

1. Install dependencies:

```bash
npm install
```

2. Run the server:

```bash
npm start
```

## The server will be available on `http://localhost:4000`.
