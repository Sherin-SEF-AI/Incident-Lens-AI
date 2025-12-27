
# Incident Lens AI 🔍⚖️

**Professional Forensic Video Analysis & Accident Reconstruction Platform**

https://youtu.be/QUVeahUrCTg?si=0KiQewMFjjllYqv4

<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-38-23" src="https://github.com/user-attachments/assets/13a1203b-a241-407d-b3a1-ff6dd1a076e6" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-38-25" src="https://github.com/user-attachments/assets/ab0c59ac-782b-4b9b-9178-064198093b14" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-38-28" src="https://github.com/user-attachments/assets/bb72ab02-448a-4d92-8acb-1515e2d18f02" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-38-30" src="https://github.com/user-attachments/assets/aac5cc23-c691-4050-93d9-6645ea4555fc" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-38-34" src="https://github.com/user-attachments/assets/f1e5607c-848d-4cbb-b7ce-4fcfc2892ccb" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-38-36" src="https://github.com/user-attachments/assets/5131b9a9-cd51-44e0-b082-6789396da3fa" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-38-41" src="https://github.com/user-attachments/assets/1a825449-37da-44ad-835c-eaefa3a5312d" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-38-45" src="https://github.com/user-attachments/assets/52e1e3ed-77da-4d56-bc6f-1b1684040339" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-38-48" src="https://github.com/user-attachments/assets/d227a2a0-f47e-409b-8588-042fce932518" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-38-54" src="https://github.com/user-attachments/assets/cd4722d6-31d0-4648-837a-88762b317743" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-39-00" src="https://github.com/user-attachments/assets/beeaf5b2-520e-4612-beae-1321630c67f6" />
<img width="1920" height="1080" alt="Screenshot from 2025-12-27 19-39-06" src="https://github.com/user-attachments/assets/3b836eae-5e6e-4384-be49-b8a8d786f36f" />

Incident Lens AI is a production-grade application designed for insurance carriers, legal defense teams, and fleet safety managers. It leverages the multimodal capabilities of **Google Gemini 3 Pro** to transform unstructured video evidence (dashcam, CCTV, bodycam) into legally admissible forensic reconstructions.

Unlike standard video players, Incident Lens AI "reasons" about the footage in real-time, calculating vehicle speeds, inferring traffic signal states from indirect visual cues, and citing specific legal statutes for fault determination.

---

## 🚀 Key Features

### 🧠 Autonomous Reconstruction
*   **Physics Engine**: Automatically calculates vehicle speed ($v=d/t$) using photogrammetry and motion blur mechanics.
*   **Signal Inference**: Deduce the state of occluded traffic lights by analyzing cross-traffic flow and pedestrian behavior.
*   **Debris Field Analysis**: Reverse-engineer impact vectors based on glass shard trajectories and fluid spray patterns.

### ⚖️ Legal Admissibility
*   **Search Grounding**: Uses the Gemini `googleSearch` tool to cross-reference observed driving behaviors with real-time case law and vehicle code statutes.
*   **Chain of Custody**: Performs automated authenticity audits to detect video tampering, frame skipping, or deepfake manipulation.
*   **Reasoning Trace**: Displays a transparent, step-by-step logic log (Thinking Mode) before generating final conclusions to ensure explainability.

### 🔊 Multimodal Synthesis
*   **Audio-Visual Fusion**: Correlates acoustic signatures (tire squeals, horns, impact thuds) with visual frames to determine reaction times precisely.
*   **Deep Scan ROI**: Users can crop specific regions of interest (license plates, signs) for high-resolution targeted forensic queries.

### 📊 Professional Reporting
*   **Interactive Dashboard**: comprehensive visualization including timelines, fault allocation charts (Pie), and driver risk profiles (Radar).
*   **PDF Dossiers**: Auto-generates specialized reports for different stakeholders:
    *   *Executive Summary* (Claims Adjusters)
    *   *Technical Reconstruction* (Engineers)
    *   *Legal Brief* (Litigators)

---

## 💎 Gemini 3 Integration

This project showcases the cutting-edge capabilities of the **Gemini 3 Pro** model via the `@google/genai` SDK:

1.  **Native Multimodality**: Ingests interleaved high-resolution video frames and raw audio waveforms (WAV) in a single context window to understand the complete scene.
2.  **Streaming with Tool Use**: implementing `generateContentStream` combined with `googleSearch` to provide real-time updates while simultaneously querying external legal databases.
3.  **Structured JSON Generation**: The model is prompted to output strictly typed JSON data structures that directly drive the React UI components (Charts, Timelines, Risk Meters).
4.  **Spatial Understanding**: Leverages the model's ability to estimate spatial dimensions (wheelbase length, lane width) for physics calibration without LiDAR data.

---

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS (Dark Mode Professional UI)
*   **AI**: Google GenAI SDK (`@google/genai`)
*   **Visualization**: Recharts (Radar/Pie Charts), Canvas API (Annotations)
*   **Media Processing**: Native AudioContext API for waveform extraction
*   **Reporting**: jsPDF for client-side document generation
*   **Icons**: Lucide React

---

## ⚡ Getting Started

### Prerequisites
*   Node.js v18+
*   A Google Cloud Project with the **Gemini API** enabled.
*   An API Key with access to `gemini-3-pro-preview`.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/incident-lens-ai.git
    cd incident-lens-ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    *   Create a `.env` file in the root directory (or set it in your deployment environment).
    *   **Security Note**: This is a client-side demo. In production, proxy API calls through a backend.
    ```env
    API_KEY=your_gemini_api_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

5.  **Build for Production**
    ```bash
    npm run build
    ```

---

## 📖 Usage Guide

1.  **Upload Evidence**: Drag & drop video files (MP4, MOV) or select a "Training Scenario" from the sidebar.
2.  **Initialize Analysis**: Click the "Initialize Analysis" button. The system will extract frames and audio.
3.  **Monitor Reasoning**: Watch the "Live Analysis Stream" to see Gemini's real-time forensic deduction process.
4.  **Explore Dashboard**:
    *   **Timeline**: Scrub through critical events.
    *   **Liability**: Review fault percentages and cited laws.
    *   **Physics**: Adjust friction coefficients in the "Variable Sandbox" to test speed calculations.
    *   **Chat**: Ask "What If" counterfactual questions (e.g., "What if the driver was going 35mph?").
5.  **Export**: Click "Export Case" to download a professional PDF dossier.

---

Author name: Sherin Joseph Roy

email: sherin.joseph2217@gmail.com

website: [sherinjosephroy.link](https://sherinjosephroy.link)

## 🛡️ License

This project is licensed under the MIT License - see the LICENSE file for details.

**Disclaimer**: Incident Lens AI is a decision-support tool. All forensic conclusions should be verified by a certified human accident reconstructionist before use in legal proceedings.
