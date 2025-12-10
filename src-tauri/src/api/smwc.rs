use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: Option<u32>,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SmwcHack {
    pub id: u32,
    pub name: String,
    #[serde(default)]
    pub section: String,
    pub time: u64, // UNIX timestamp, required
    #[serde(default)]
    pub moderated: bool,
    #[serde(default)]
    pub authors: Vec<User>,
    #[serde(default)]
    pub submitter: Option<User>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub images: Option<Vec<String>>,
    #[serde(default)]
    pub rating: Option<f64>,
    #[serde(default)]
    pub size: u64, // File size in bytes
    #[serde(default)]
    pub downloads: u32,
    #[serde(default)]
    pub download_url: String,
    #[serde(default)]
    pub obsoleted_by: Option<u32>,
    #[serde(default)]
    pub fields: serde_json::Value, // Object/map of field names to values (as HTML strings)
    #[serde(default)]
    pub raw_fields: serde_json::Value, // Object/map of field names to raw values
}

// Paginated response structure
#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse {
    pub total: u32,
    pub per_page: u32,
    pub current_page: u32,
    pub last_page: u32,
    pub data: Vec<SmwcHack>,
}

// Response with rate limit information
pub struct RateLimitedResponse<T> {
    pub data: T,
    pub rate_limit_remaining: Option<u32>,
    pub rate_limit_reset: Option<u64>,
}

// Custom error type for rate limiting
#[derive(Debug)]
pub enum ApiError {
    RateLimited { retry_after: u64 },
    DecodeError { message: String, response_body: String },
    Other(reqwest::Error),
}

impl From<reqwest::Error> for ApiError {
    fn from(err: reqwest::Error) -> Self {
        ApiError::Other(err)
    }
}

pub struct SmwcClient {
    base_url: String,
    client: Client,
}

impl SmwcClient {
    pub fn new(base_url: Option<String>) -> Self {
        Self {
            base_url: base_url.unwrap_or_else(|| "https://www.smwcentral.net/ajax.php".to_string()),
            client: Client::builder()
                .user_agent("RH-MGR/1.0")
                .build()
                .expect("Failed to create HTTP client"),
        }
    }

    pub async fn get_hacks(&self, section: Option<&str>, page: Option<u32>) -> Result<RateLimitedResponse<PaginatedResponse>, ApiError> {
        // Default section name for SMW hacks - adjust if needed
        let section_name = section.unwrap_or("smwhacks");
        let page_num = page.unwrap_or(1);
        let url = format!("{}?a=getsectionlist&s={}&n={}", self.base_url, section_name, page_num);
        
        let response = self.client.get(&url).send().await?;
        
        // Extract rate limit headers
        let rate_limit_remaining = response.headers()
            .get("X-RateLimit-Remaining")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.parse::<u32>().ok());
        
        let rate_limit_reset = response.headers()
            .get("X-RateLimit-Reset")
            .and_then(|h| h.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
        
        // Check for 429 status before parsing body
        if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
            let retry_after = response.headers()
                .get("Retry-After")
                .and_then(|h| h.to_str().ok())
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(60);
            
            return Err(ApiError::RateLimited { retry_after });
        }
        
        if !response.status().is_success() {
            return Err(ApiError::Other(response.error_for_status().unwrap_err()));
        }

        // Get response text first so we can see what we're actually receiving
        let text = response.text().await?;
        
        // Try to deserialize and provide better error messages
        let paginated: PaginatedResponse = match serde_json::from_str(&text) {
            Ok(p) => p,
            Err(e) => {
                // Return a decode error with the actual response body
                let body_snippet = if text.len() > 2000 {
                    format!("{}... (truncated, total length: {})", &text[..2000], text.len())
                } else {
                    text.clone()
                };
                return Err(ApiError::DecodeError {
                    message: format!("Failed to decode API response: {}", e),
                    response_body: body_snippet,
                });
            }
        };
        
        Ok(RateLimitedResponse {
            data: paginated,
            rate_limit_remaining,
            rate_limit_reset,
        })
    }

    pub async fn get_file_details(&self, file_id: u32) -> Result<SmwcHack, reqwest::Error> {
        let url = format!("{}?a=getfile&v=2&id={}", self.base_url, file_id);
        let response = self.client.get(&url).send().await?;
        
        if !response.status().is_success() {
            return Err(response.error_for_status().unwrap_err());
        }

        let file: SmwcHack = response.json().await?;
        Ok(file)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path, query_param};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn test_fetch_hacks_success() {
        let mock_server = MockServer::start().await;
        
        let mock_response = PaginatedResponse {
            total: 2,
            per_page: 50,
            current_page: 1,
            last_page: 1,
            data: vec![
                SmwcHack { 
                    id: 1, 
                    name: "Hack 1".to_string(),
                    section: "smwhacks".to_string(),
                    time: 1234567890,
                    moderated: true,
                    authors: vec![User { id: Some(1), name: "Author 1".to_string() }],
                    submitter: None,
                    tags: vec![],
                    images: None,
                    rating: None,
                    size: 1024,
                    downloads: 100,
                    download_url: "".to_string(),
                    obsoleted_by: None,
                    fields: serde_json::json!({}),
                    raw_fields: serde_json::json!({}),
                },
            ],
        };
        
        Mock::given(method("GET"))
            .and(path("/ajax.php"))
            .and(query_param("a", "getsectionlist"))
            .and(query_param("s", "smwhacks"))
            .respond_with(ResponseTemplate::new(200).set_body_json(&mock_response))
            .mount(&mock_server)
            .await;
            
        let client = SmwcClient::new(Some(format!("{}/ajax.php", mock_server.uri())));
        let result = client.get_hacks(None, None).await.unwrap();
        
        assert_eq!(result.data.data.len(), 1);
        assert_eq!(result.data.data[0].name, "Hack 1");
    }
}
