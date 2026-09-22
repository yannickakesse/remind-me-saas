async function main() {
  const token = "8756563615:AAEH0PXAxPP6wgn52S_ZAmgcnxP5Z6XhBXc";
  console.log("Checking Telegram updates for token:", token.slice(0, 10) + "...");
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await res.json();
    console.log("Telegram API Response:", JSON.stringify(data, null, 2));

    if (data.ok && data.result && data.result.length > 0) {
      const lastUpdate = data.result[data.result.length - 1];
      const chatId = lastUpdate.message?.chat?.id;
      const firstName = lastUpdate.message?.chat?.first_name;
      console.log(`\n🎉 Found Chat ID: ${chatId} (${firstName})`);

      // Send a test message
      const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🚀 <b>Félicitations !</b>\n\nVotre bot Telegram <b>RemindMeAlertsBot</b> est maintenant 100% opérationnel.\n\nVous recevrez ici toutes les notifications en temps réel lorsque des utilisateurs s'inscriront sur Remind Me !`,
          parse_mode: "HTML",
        }),
      });
      const sendData = await sendRes.json();
      console.log("Test message sent status:", sendData.ok ? "SUCCESS" : "FAILED");
    } else {
      console.log("\n⚠️ No messages received yet. Please open https://t.me/RemindMeAlertsbot and click Start or send a message.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
