import { Router } from 'express';
import { updateUserProfile, getAllUsers, getUserById, getUserWebsites, getUserWebsiteById } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';
import { get } from 'node:http';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Update current user's profile
router.patch('/profile', updateUserProfile);

// Get all users
router.get('/', getAllUsers);

// Get user's websites
router.get('/websites', getUserWebsites);

// Get single website details
router.get('/websites/:id', getUserWebsiteById);

// Get user by ID
router.get('/:id', getUserById);


export default router;