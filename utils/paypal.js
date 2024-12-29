import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const razorpay = new Razorpay({
  key_id: 'rzp_test_0n7wk0znzJmOxP',
  key_secret: 'QsATwxr43Cy9PyVhZfP26Fsw',
});

app.post("/api/create-payment/:classId", async (req, res) => {
  try {
    const { classId } = req.params;
    const { amount } = req.body; // Amount in INR (e.g., 5000 for ₹50.00)

    const options = {
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${classId}`,
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    res.status(500).json({ success: false, message: "Payment initiation failed" });
  }
});

export default razorpay;
