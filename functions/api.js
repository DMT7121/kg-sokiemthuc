export async function onRequest(context) {
  const { request } = context;
  
  // Handle OPTIONS preflight request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  // Only accept POST requests
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  try {
    const bodyText = await request.text();
    
    // Target Google Apps Script Web App URL (Authorized Public Deployment)
    let gasUrl = "https://script.google.com/macros/s/AKfycby_Q7mApPK1KcMlTs7WFgrcI_wNS5iUSDyUwFIX2eW-tt1a18sTMpMnbCqj68yimVrr1Q/exec";
    
    // Fetch with manual redirect mode to preserve POST method across 302 redirects
    let response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: bodyText,
      redirect: "manual"
    });

    let redirectCount = 0;
    while ((response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) && redirectCount < 5) {
      const redirectUrl = response.headers.get("location");
      if (!redirectUrl) break;
      
      // Perform the next hop as a POST request to keep the payload intact
      response = await fetch(redirectUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: bodyText,
        redirect: "manual"
      });
      redirectCount++;
    }
    
    // Read the final response body
    const responseData = await response.text();
    
    // Return to client with appropriate CORS headers
    return new Response(responseData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message || err.toString() }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
