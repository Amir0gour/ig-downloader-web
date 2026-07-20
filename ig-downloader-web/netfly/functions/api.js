const express = require('express');
const cors = require('cors');
const axios = require('axios');
const serverless = require('serverless-http');

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());

const RAPIDAPI_KEY = '0893825be6msh438aa7aa83de9c8p19c6f4jsnef938c7e939c';
const RAPIDAPI_HOST = 'instagram120.p.rapidapi.com';

function getShortcode(url) {
    if (!url) return null;
    // Strip query strings (e.g. ?igsh=...) before matching
    const cleanUrl = url.split('?')[0];
    const match = cleanUrl.match(/(?:reels?|p|tv|share\/reel)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
}

router.post('/download', async (req, res) => {
    console.log("RAW REQ BODY:", req.body);
    console.log("REQ HEADERS:", req.headers);

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {}
        }

        // Check all common key names from UI
        const url = body ? (body.url || body.link || body.instagramUrl) : null;
        console.log("EXTRACTED URL:", url);

        if (!url || !url.includes('instagram.com')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide a valid Instagram URL.',
                receivedBody: req.body
            });
        }

        const shortcode = getShortcode(url);
        if (!shortcode) {
            return res.status(400).json({ success: false, error: 'Could not extract shortcode from link.' });
        }

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
        let videoUrl = null;

        if (Array.isArray(data) && data[0]?.urls?.[0]?.url) {
            videoUrl = data[0].urls[0].url;
        } else if (data?.urls?.[0]?.url) {
            videoUrl = data.urls[0].url;
        } else if (data?.video_url) {
            videoUrl = data.video_url;
        }

        if (videoUrl) {
            return res.json({ success: true, downloadUrl: videoUrl });
        } else {
            return res.status(404).json({ success: false, error: 'Could not extract video link.' });
        }

    } catch (err) {
        console.error("Backend Error:", err.response?.data || err.message);
        return res.status(500).json({ success: false, error: 'Failed to process request.' });
    }
});

app.use('/.netlify/functions/api', router);
app.use('/api', router); // Fallback for local routes

module.exports.handler = serverless(app);