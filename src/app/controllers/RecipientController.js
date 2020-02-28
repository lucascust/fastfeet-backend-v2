import * as Yup from 'yup';

import Recipient from '../models/Recipient';

class RecipientController {
  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().max(100),
      rua: Yup.string().max(100),
      numero: Yup.string().max(5),
      complemento: Yup.string().max(50),
      estado: Yup.string().max(30),
      cidade: Yup.string().max(50),
      cep: Yup.string(),
    });

    const schemaVerify = await schema.validate(req.body).catch(err => {
      return err.message;
    });
    if (typeof schemaVerify === 'string') {
      return res.status(400).json({ error: schemaVerify });
    }

    const {
      name,
      rua,
      numero,
      complemento,
      estado,
      cidade,
      cep,
    } = await Recipient.create(req.body);

    return res.json({
      name,
      rua,
      numero,
      complemento,
      estado,
      cidade,
      cep,
    });
  }
}

export default new RecipientController();
