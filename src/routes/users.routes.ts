import express from 'express';
import { getUserDepartmentsController, getUserDetailsController, getUsersController, getUserSubjectsController } from '../controller/users.controller';

const router = express.Router();

router.route('/').get( getUsersController );
router.route('/:id').get( getUserDetailsController );
router.route('/:id/departments').get( getUserDepartmentsController );
router.route('/:id/subjects').get( getUserSubjectsController );

export default router;