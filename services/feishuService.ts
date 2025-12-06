import { AnalysisResult, FeishuConfig } from "../types";

// Feishu Open API Base URL
const FEISHU_API_HOST = "https://open.feishu.cn/open-apis";

export const syncToFeishu = async (
  result: AnalysisResult, 
  folderToken: string,
  config: FeishuConfig
): Promise<{ success: boolean; docUrl?: string; message: string }> => {
  
  if (!config.appId || !config.appSecret) {
    throw new Error("Missing Feishu configuration (App ID / Secret).");
  }

  // Handle Proxy Logic
  const baseUrl = config.proxyUrl 
    ? config.proxyUrl.replace(/\/$/, '') + '/' + FEISHU_API_HOST 
    : FEISHU_API_HOST;

  const handleFetch = async (url: string, options: RequestInit) => {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error: any) {
      // Catch network errors (like CORS)
      if (error.name === 'TypeError' || error.message === 'Failed to fetch') {
         if (!config.proxyUrl) {
            throw new Error("CORS Blocked: Browser cannot access Feishu directly. Please set a Proxy URL in Settings.");
         } else {
            throw new Error("Proxy Error: Failed to fetch via Proxy. You may need to visit the proxy URL to enable access (e.g. cors-anywhere demo page).");
         }
      }
      throw error;
    }
  };

  try {
    // 1. Get Tenant Access Token
    const tokenResponse = await handleFetch(`${baseUrl}/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json; charset=utf-8" 
      },
      body: JSON.stringify({
        "app_id": config.appId,
        "app_secret": config.appSecret
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      let errMsg = tokenResponse.statusText;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.msg || errMsg;
      } catch (e) {}
      throw new Error(`Auth Failed (${tokenResponse.status}): ${errMsg}`);
    }

    const tokenData = await tokenResponse.json();
    if (tokenData.code !== 0) {
      throw new Error(`Auth Error: ${tokenData.msg}`);
    }
    const accessToken = tokenData.tenant_access_token;

    // 2. Create Document
    const createDocPayload: any = {};
    if (folderToken && folderToken.trim() !== '') {
      createDocPayload.folder_token = folderToken;
    }

    const createDocResponse = await handleFetch(`${baseUrl}/docx/v1/documents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(createDocPayload)
    });

    if (!createDocResponse.ok) {
        throw new Error(`Create Doc Failed: ${createDocResponse.statusText}`);
    }
    const docData = await createDocResponse.json();
    if (docData.code !== 0) {
        throw new Error(`Create Doc Error: ${docData.msg}`);
    }

    const documentId = docData.data.document.document_id;
    
    // 3. Prepare Content Blocks
    const title = result.mindmap.name || "Video Analysis";
    
    // Convert result to Feishu blocks
    const children = [];

    // Title Block (Heading 1)
    children.push({
      block_type: 3, // Heading 1
      heading1: {
        elements: [{ text_run: { content: `[AI Analysis] ${title}` } }]
      }
    });

    // Key Takeaways Header
    children.push({
      block_type: 4, // Heading 2
      heading2: {
        elements: [{ text_run: { content: "Key Takeaways" } }]
      }
    });

    // Key Points (Bullets)
    result.keyPoints.forEach(point => {
      children.push({
        block_type: 10, // Bullet
        bullet: {
          elements: [{ text_run: { content: point } }]
        }
      });
    });

    // Summary Header
    children.push({
      block_type: 4, // Heading 2
      heading2: {
        elements: [{ text_run: { content: "Content Summary" } }]
      }
    });

    // Summary Text (Paragraph)
    children.push({
      block_type: 2, // Text
      text: {
        elements: [{ text_run: { content: result.summary } }]
      }
    });
    
    // Source Header
    children.push({
      block_type: 4, // Heading 2
      heading2: {
         elements: [{ text_run: { content: "Source Info" } }]
      }
    });
    
    // Source Text
    children.push({
      block_type: 2, 
      text: {
        elements: [{ text_run: { content: result.source?.value || "Uploaded Video" } }]
      }
    });

    // 4. Write Content to Document
    const addContentResponse = await handleFetch(`${baseUrl}/docx/v1/documents/${documentId}/blocks/${documentId}/children/batch_create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        children: children,
        index: 0 // Insert at the beginning
      })
    });

    if (!addContentResponse.ok) {
        throw new Error(`Write Content Failed: ${addContentResponse.statusText}`);
    }
    const writeData = await addContentResponse.json();
    if (writeData.code !== 0) {
        throw new Error(`Write Content Error: ${writeData.msg}`);
    }

    return {
      success: true,
      docUrl: `https://feishu.cn/docx/${documentId}`,
      message: "Document synced successfully!"
    };

  } catch (error: any) {
    console.error("Feishu Sync Error:", error);
    throw error;
  }
};