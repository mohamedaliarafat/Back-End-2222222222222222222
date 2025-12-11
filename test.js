// test.js

console.log("🚀 Starting FCM test...");

const { sendFCMNotification } = require("./config/firebase");

async function test() {
  try {
    const token =
      "fh4PfOz1RF-Sn259saAZvJ:APA91bHJVBz9K613vUqu-3vTLguBXbrsVmB9andJszz_PGYH0MEs8d1TOWrOJOgI3AuCYVgp-gM9uTg4p__2wOKdKGBfvehMwXAOP_rSGFwRZ0nrAvrjEy4";

    console.log("📨 Sending test FCM message...");

    const result = await sendFCMNotification(
      token,
      {
        title: "🔥 Test Notification",
        body: "Your FCM setup works successfully!",
        type: "test",
        routing: {
          screen: "Notifications",
        },
        data: {},
        priority: "high",
      },
      {
        customKey: "customValue",
      }
    );

    console.log("=== RESULT ===");
    console.log(result);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

test();
