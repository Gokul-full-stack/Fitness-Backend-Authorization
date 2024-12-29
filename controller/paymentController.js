import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../model/booking.js";
import Payment from "../model/payment.js";
import User from "../model/user.js";
import Class from "../model/class.js";
import { sendEmail } from "../service/emailService.js";

const razorpayInstance = new Razorpay({
  key_id:"rzp_test_0n7wk0znzJmOxP",
  key_secret: "QsATwxr43Cy9PyVhZfP26Fsw",
});

// Create Razorpay Order
const createPayment = async (req, res) => {
  try {
    const { classId } = req.params;
    const { amount } = req.body;

    // Generate a valid receipt value
    const receipt = `receipt_${classId}`.substring(0, 40);
    console.log("Generated receipt:", receipt);

    // Create a Razorpay order
    const options = {
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt,
    };

    const order = await razorpayInstance.orders.create(options);

    const newPay = await Payment.create(req.body);
    // Send success response
    return res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });

    
  } catch (error) {
    return res.status(500).json({ error: "Failed to create Razorpay order." });
  }
};



// Verify Razorpay Payment and Complete Booking
const paymentAndBookingSuccess = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, userId } = req.body;
    const classId = req.params.classId;
    // Verify Razorpay signature
    const hmac = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (hmac !== razorpay_signature) {
       console.error("Signature mismatch");
      return res.status(400).json({ message: "Invalid payment signature" });
    }
  
    const selectedClass = await Class.findOne({ classId:req.params.classId });
    if (!selectedClass || selectedClass.status !== "available") {
      return res.status(400).json({ message: "Class not available for booking" });
    }
   
    // Check if the user has already booked the class
    const usercurrent = await User.findOne({ id: userId });
    if (!usercurrent) {
      return res.status(404).json({ message: "User not found" });
    }

    if (usercurrent.bookings.includes(req.params.classId)) {
      return res.status(400).json({ message: "You have already booked this class" });
    }

    const confirmedBookingsCount = await Booking.countDocuments({
      classId,
      bookingStatus: "confirmed",
    });
    
    if (confirmedBookingsCount >= selectedClass.capacity) {
      return res.status(400).json({ message: "Class capacity full" });
    }
    
    const booking = await Booking.create({
      userId,
      classId,
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      bookingDate: new Date(),
      classDate: selectedClass.timeSlot.day,
    });

    await Class.updateOne(
      { classId },
      { $inc: { bookedCount: 1 }, $push: { attendees: userId } }
    );

    await User.updateOne({ id: userId }, { $push: { bookings: req.params.classId } });

    const newPayment = await Payment.create({
      userId,
      bookingId: booking._id,
      amount: selectedClass.price,
      paymentMethod: "card",
      paymentStatus: "success",
      transactionId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });

    const userEmail = usercurrent.email;
    const classDetails = `
      Class Name: ${selectedClass.className}
      Class Date: ${selectedClass.timeSlot.day}
      Start Time: ${selectedClass.timeSlot.startTime}
      End Time: ${selectedClass.timeSlot.endTime}
      Class Link: ${selectedClass.classLink}
    `;
    await sendEmail(
      userEmail,
      "Class Booked",
      `You have successfully booked the class.\n\n${classDetails}`
    );

    res.status(201).json({
      success: true,
      message: "Payment and booking successful!",
      booking,
      payment: newPayment,
    });
  } catch (error) {
    console.error("Error in payment and booking process:", error);
    res.status(500).json({ error: "Payment and booking process failed." });
  }
};

export default {
  createPayment,
  paymentAndBookingSuccess,
};
