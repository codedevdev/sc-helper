use std::time::Duration;

#[tauri::command]
pub async fn uex_http_get(url: String, token: Option<String>) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let mut request = client.get(&url);
    if let Some(t) = token.filter(|s| !s.is_empty()) {
        request = request.header("Authorization", format!("Bearer {t}"));
    }

    let response = request.send().await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    response.text().await.map_err(|e| e.to_string())
}
