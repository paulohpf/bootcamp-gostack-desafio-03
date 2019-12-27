import * as Yup from 'yup';
import { Op } from 'sequelize';
import Student from '../models/Student';

class StudentController {
  async index(req, res) {
    const { page = 1, searchText = '' } = req.query;

    const { count, rows: students } = await Student.findAndCountAll({
      attributes: ['id', 'name', 'email', 'age'],
      where: {
        name: { [Op.iLike]: `%${searchText}%` },
      },
      order: ['name'],
      offset: (page - 1) * 10,
      limit: 10,
    });

    return res.json({
      searchText,
      offset: (page - 1) * 10,
      totalPages: Math.ceil(count / 10) !== 0 ? Math.ceil(count / 10) : 1,
      rows: students,
    });
  }

  async getById(req, res) {
    const schema = Yup.object().shape({
      id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.params)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id } = req.params;

    const student = await Student.findByPk(id);

    return res.json(student);
  }

  async getUserData(req, res) {
    const schema = Yup.object().shape({
      id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id } = req.body;

    const student = await Student.findByPk(id);

    return res.json(student);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string()
        .email()
        .required(),
      age: Yup.number().required(),
      weight: Yup.string().required(),
      height: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation fails' });

    const studentExists = await Student.findOne({
      where: { email: req.body.email },
    });

    if (studentExists)
      return res.status(400).json({ error: 'Student already exists' });

    const { id, name, email } = await Student.create(req.body);

    return res.json({
      id,
      name,
      email,
    });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      age: Yup.number(),
      weight: Yup.string(),
      height: Yup.string(),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation fails' });

    const { id, email } = req.body;

    const student = await Student.findByPk(id);

    if (email !== student.email) {
      const studentExists = await Student.findOne({
        where: { email },
      });

      if (studentExists)
        return res.status(400).json({ error: 'Student already exists' });
    }

    const { age, weight, height } = await student.update(req.body);

    return res.json({ id, email, age, weight, height });
  }
}

export default new StudentController();
