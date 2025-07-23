// functions/dummy.js
import { onRequest } from 'firebase-functions/v2/https';

export const dummy = onRequest((req, res) => {
    res.status(200).send("✅ dummy function is alive");
});