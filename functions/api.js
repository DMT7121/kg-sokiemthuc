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
    let gasUrl = "https://script.google.com/macros/s/AKfycbztN-khJ8QEvj08c02GVvvLvAOKZZ7O9ZMMeUFAMMmtCWR7V5LWSWQ60eOkOMcedx-4CQ/exec";
    
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
    
    // Detect if Google Apps Script returned HTML (login page or error page)
    const trimmedData = responseData.trim();
    if (trimmedData.startsWith("<!DOCTYPE") || trimmedData.startsWith("<html") || trimmedData.toLowerCase().includes("google accounts") || trimmedData.toLowerCase().includes("page not found")) {
      const errorMsg = {
        success: false,
        error: "Yêu cầu cấp quyền: Google Apps Script Web App chưa được chia sẻ công khai hoặc chưa được ủy quyền tài khoản. Vui lòng vào Google Sheet -> Tiện ích mở rộng -> Apps Script, chạy thử một hàm để đồng ý cấp quyền, và chọn Deploy -> New Deployment -> Chọn Web App -> Configure 'Execute as: Me' và 'Who has access: Anyone'."
      };
      return new Response(JSON.stringify(errorMsg), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    
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
