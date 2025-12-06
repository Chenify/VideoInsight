// ==============================================================================
// 预置配置 (System Configuration)
// ==============================================================================
// 为了让终端用户无需手动配置，开发者可以在此处填入飞书应用的凭证。
// 注意：在前端代码中硬编码 Secret 有安全风险，仅建议在受信任的内部环境或演示中使用。
// ==============================================================================

export const SYSTEM_CONFIG = {
  // 1. 飞书 App ID (必填)
  appId: "", 
  
  // 2. 飞书 App Secret (必填)
  appSecret: "", 
  
  // 3. 默认代理地址 (必填，用于解决浏览器跨域问题)
  // 如果你的 App ID/Secret 是空的，这个代理地址也可以帮助用户解决网络问题
  proxyUrl: "https://cors-anywhere.herokuapp.com/",
  
  // 4. (可选) 默认保存的父文件夹 Token
  defaultFolderToken: ""
};

// 检查系统是否已完全配置
export const isSystemConfigured = () => {
  return !!(SYSTEM_CONFIG.appId && SYSTEM_CONFIG.appSecret);
};