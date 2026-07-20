const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const RAPIDAPI_KEY = '0893825be6msh438aa7aa83de9c8p19c6f4jsnef938c7e939c';
const RAPIDAPI_HOST = 'instagram120.p.rapidapi.com';

function getShortcode(url) {
    const match = url.match(/(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
}

app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url || !url.includes('instagram.com')) {
            return res.status(400).json({ success: false, error: 'Please provide a valid Instagram URL.' });
        }

        const shortcode = getShortcode(url);
        if (!shortcode) {
            return res.status(400).json({ success: false, error: 'Could not extract shortcode from link.' });
        }

        console.log(`🔍 Fetching media for shortcode: ${shortcode}`);

        const response = await axios.post(
            'https://instagram120.p.rapidapi.com/api/instagram/mediaByShortcode',
            { shortcode: shortcode },
            {
                headers: {
                    'content-type': 'application/json',
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': RAPIDAPI_HOST
                }
            }
        );

        const data = response.data;

        // Parse the exact response structure from instagram120
        let videoUrl = null;

        if (Array.isArray(data) && data[0]?.urls?.[0]?.url) {
            videoUrl = data[0].urls[0].url;
        } else if (data?.urls?.[0]?.url) {
            videoUrl = data.urls[0].url;
        } else if (data?.video_url) {
            videoUrl = data.video_url;
        }

        if (videoUrl) {
            console.log("✅ Direct Video URL extracted successfully!");
            return res.json({ success: true, downloadUrl: videoUrl });
        } else {
            return res.status(404).json({ success: false, error: 'Could not extract video link from response.' });
        }

    } catch (err) {
        console.error("RapidAPI Error details:", err.response ? err.response.data : err.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to process request. Please try again.'
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});