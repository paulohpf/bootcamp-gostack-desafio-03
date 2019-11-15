import * as Yup from 'yup';
import EnrollPlan from '../models/EnrollPlan';

class EnrollPlanController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const enrollPlans = await EnrollPlan.findAll({
      order: ['updated_at'],
      attributes: ['id', 'title', 'duration', 'price'],
      limite: 20,
      offset: (page - 1) * 20,
    });

    return res.json(enrollPlans);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      duration: Yup.number().required(),
      price: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id, title, duration, price } = await EnrollPlan.create(req.body);

    return res.json({
      id,
      title,
      duration,
      price,
    });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      id: Yup.number().required(),
      title: Yup.string(),
      duration: Yup.number(),
      price: Yup.number(),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id } = req.body;

    const enrollPlan = await EnrollPlan.findByPk(id);

    const existEnrollPlan = await EnrollPlan.findOne({
      where: { id },
    });
    if (!existEnrollPlan)
      return res.status(400).json({ error: 'Enroll Plan does not exists' });

    const { title, duration, price } = await enrollPlan.update(req.body);

    return res.json({
      id,
      title,
      duration,
      price,
    });
  }

  /**
   * Criar requisição de DELETE
   */
  async delete(req, res) {
    return res.json();
  }
}

export default new EnrollPlanController();
