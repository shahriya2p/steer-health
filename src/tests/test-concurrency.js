const http = require("http");

const CONCURRENCY = 10;

function makeRequest(i) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      slot: "2025-12-05T10:00:00.000Z",
      patientName: `Patient ${i}`,
    });

    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/book-appointment",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          parsed = body;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log(`Starting concurrency test (${CONCURRENCY} requests)`);

  const jobs = Array.from({ length: CONCURRENCY }, (_, i) =>
    makeRequest(i + 1)
  );

  try {
    const results = await Promise.all(jobs);

    results.forEach((r, idx) => {
      const id = idx + 1;
      if (r.status === 201) {
        console.log(`${id}: 201 OK`);
      } else if (r.status === 409) {
        const reason = r.body && r.body.error ? r.body.error : r.body;
        console.log(`${id}: 409 CONFLICT - ${reason}`);
      } else {
        console.log(`${id}: ${r.status} - ${JSON.stringify(r.body)}`);
      }
    });

    const success = results.filter((r) => r.status === 201).length;
    const conflicts = results.filter((r) => r.status === 409).length;
    const others = results.length - success - conflicts;

    console.log(
      `Summary: success=${success}, conflicts=${conflicts}, others=${others}`
    );

    if (success === 1 && conflicts === CONCURRENCY - 1) {
      console.log("TEST PASSED");
    } else {
      console.log("TEST FAILED");
    }
  } catch (err) {
    console.error("Test error:", err);
  }
}

// Run after a short delay to allow server start if invoked immediately
setTimeout(runTest, 1000);
