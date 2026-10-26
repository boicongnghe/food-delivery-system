import { Router } from 'express';
import * as addressController from '../controllers/addressController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.get('/', addressController.getAddresses);
router.post('/', addressController.createAddress);
router.patch('/:id/default', addressController.setDefaultAddress);
router.delete('/:id', addressController.deleteAddress);

export default router;
