import { Router } from 'express';
import { authenticate } from '../middleware/auth';
const router = Router();
router.use(authenticate);
router.get('/', async (req, res, next) => {
  try {
    res.json({ message: 'Automations endpoint - to be implemented' });
  } catch (error) {
    next(error);
  }
});
export default router;