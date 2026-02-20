import express from 'express';
import { departmentsController, departmentsGetDetailsController, departmentsPostController, departmentSubjectsController, departmentClassesController, departmentUsersController } from '../controller/departments.controller';

const router = express.Router();

router.route('/').get( departmentsController );
router.route('/').post( departmentsPostController );
router.route('/:id').get( departmentsGetDetailsController );
router.route('/:id/subjects').get( departmentSubjectsController );
router.route('/:id/classes').get( departmentClassesController );
router.route('/:id/users').get( departmentUsersController );

export default router;