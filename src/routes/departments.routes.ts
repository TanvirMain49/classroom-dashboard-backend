import express from 'express';
import { departmentsController } from '../controller/departments.controller';

const router = express.Router();

router.route('/').get( departmentsController );

export default router;