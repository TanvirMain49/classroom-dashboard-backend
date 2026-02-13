import express from 'express';
import { usersController } from '../controller/users.controller';

const router = express.Router();

router.route('/').get(usersController);

export default router;