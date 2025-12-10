# Fin Cap - AI Financial Analyst

A comprehensive AI-powered financial analysis tool.

## 🚀 Deployment on Vercel

This application is designed to be deployed on **Vercel** to ensure the API Key remains secure.

### Steps to Deploy

1.  **Push to GitHub**: Commit your code and push it to a GitHub repository.
2.  **Import to Vercel**:
    *   Go to your [Vercel Dashboard](https://vercel.com/dashboard).
    *   Click **Add New...** -> **Project**.
    *   Select your GitHub repository.
3.  **Configure Environment Variables** (The Security Step):
    *   In the "Configure Project" screen, expand the **Environment Variables** section.
    *   Add a new variable:
        *   **Key**: `API_KEY`
        *   **Value**: *(Paste your Google Gemini API Key here)*
    *   Click **Add**.
4.  **Deploy**: Click the **Deploy** button.

### 🔒 Security Architecture

*   **Client-Side (React)**: The frontend (`App.tsx`) never sees the API key. It sends a request to `/api/analyze`.
*   **Server-Side (Vercel Functions)**: The file `api/analyze.ts` runs on Vercel's secure servers. It accesses `process.env.API_KEY` to authenticate with Google, processes the data, and sends the clean result back to the frontend.

## Local Development

1.  Ensure you have a `.env` file in the root directory:
    ```
    API_KEY=your_actual_api_key_here
    ```
2.  Run `npm run dev`.
