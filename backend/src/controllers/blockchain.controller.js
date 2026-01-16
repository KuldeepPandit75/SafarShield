import {
  registerTouristOnChain,
  verifyTouristOnChain,
  getTouristFromChain,
} from "../services/blockchain.service.js";

export const registerTourist = async (req, res) => {
  try {
    const { aadhaar, name, phone } = req.body;

    const result = await registerTouristOnChain({ aadhaar, name, phone });

    res.status(200).json({
      message: "Tourist registered successfully",
      touristId: result.touristId,
      txHash: result.txHash,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
};

export const verifyTourist = async (req, res) => {
  try {
    const { touristId } = req.body;

    const verified = await verifyTouristOnChain(touristId);

    res.status(200).json({ touristId, verified });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
};

export const getTourist = async (req, res) => {
  try {
    const { touristId } = req.params;

    const data = await getTouristFromChain(touristId);

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
};
