const allowedOrigins = [
  "http://localhost:5173", // Local frontend
  "https://yourfrontenddomain.com", // Production frontend (Replace this)
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`Blocked by CORS: ${origin}`); // Debugging log
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allows cookies & authentication headers
};

module.exports = { corsOptions };
