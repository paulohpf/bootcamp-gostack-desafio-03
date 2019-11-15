import { Router } from 'express';

import StudentController from './app/controllers/StudentController';
import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import EnrollPlanController from './app/controllers/EnrollPlanController';

import authMiddleware from './app/middlewares/auth';

const routes = new Router();

routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);

routes.use(authMiddleware);

routes.post('/students', StudentController.store);
routes.put('/students', StudentController.update);

routes.get('/enrollplans', EnrollPlanController.index);
routes.post('/enrollplans', EnrollPlanController.store);
routes.put('/enrollplans', EnrollPlanController.update);
routes.delete('/enrollplans', EnrollPlanController.delete);

export default routes;
