// List of allowed origins (multiple frontends)
const allowedOrigins = [
  "http://localhost:5173", // Local frontend
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allows cookies & authentication headers
};

module.exports = { corsOptions };
