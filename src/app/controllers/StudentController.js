import * as Yup from 'yup';
import Student from '../models/Student';

class StudentController {
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
