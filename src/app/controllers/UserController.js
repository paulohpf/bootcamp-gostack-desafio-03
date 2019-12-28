import { Op } from 'sequelize';
import * as Yup from 'yup';
import User from '../models/User';

class UserController {
  async index(req, res) {
    const { page = 1, searchText = '' } = req.query;

    const { count, rows: users } = await User.findAndCountAll({
      where: {
        name: {
          [Op.iLike]: `%${searchText}%`,
        },
      },
      attributes: ['id', 'name', 'email'],
      limit: 10,
      offset: (page - 1) * 10,
    });

    return res.json({
      searchText,
      offset: (page - 1) * 10,
      totalPages: Math.ceil(count / 10) !== 0 ? Math.ceil(count / 10) : 1,
      rows: users,
    });
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string()
        .email()
        .required(),
      password: Yup.string()
        .required()
        .min(6),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation fails' });

    const userExists = await User.findOne({ where: { email: req.body.email } });

    if (userExists)
      return res.status(400).json({ error: 'User already exists' });

    const { id, name, email, provider } = await User.create(req.body);

    return res.json({
      id,
      name,
      email,
      provider,
    });
  }
}

export default new UserController();
