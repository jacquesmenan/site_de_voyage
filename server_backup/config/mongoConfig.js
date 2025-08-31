const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../../config.env' });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE || 'mongodb://localhost:27017/cedric-dubai-solutions', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.underline.bold);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
