import * as Yup from 'yup';
import { getHours, format } from 'date-fns';
import pt from 'date-fns/locale/pt-BR';
import { Op } from 'sequelize';

import Order from '../models/Order';
import Recipient from '../models/Recipient';
import Deliverer from '../models/Deliverer';

import Mail from '../../lib/Mail';

class OrderController {
  async index(req, res) {
    const { page = 1, option = '0' } = req.query;

    /**
     * Order search options:
     * 0 : Not canceled and not started
     * 1 : Already started and not finished
     * 2 : Already finished
     * 3 : Canceled
     */
    const order = await Order.findAll({
      where: {
        canceled_at: option === '3' ? { [Op.not]: null } : null,
        started: option === '1' || option === '2' ? { [Op.not]: null } : null,
        ended: option === '2' ? { [Op.not]: null } : null,
      },
      order: ['created_at'],
      attributes: ['id', 'product'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: ['id', 'name'],
        },
        {
          model: Deliverer,
          as: 'deliverer',
          attributes: ['id', 'first_name', 'last_name'],
        },
      ],
    });

    return res.json(order);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      product: Yup.string().max(150),
      deliverer_id: Yup.number(),
      recipient_id: Yup.number(),
    });
    /**
     * Verify if input fit in schema, returning scpecific message
     */
    const schemaVerify = await schema.validate(req.body).catch(err => {
      return err.message;
    });
    if (typeof schemaVerify === 'string') {
      return res.status(400).json({ error: schemaVerify });
    }

    /**
     * Existance verifications
     */
    const delivererVerify = await Deliverer.findOne({
      where: { id: req.body.deliverer_id },
    });
    if (!delivererVerify) {
      return res.status(400).json({ error: 'Deliverer does not exist.' });
    }
    const recipientVerify = await Recipient.findOne({
      where: { id: req.body.recipient_id },
    });
    if (!recipientVerify) {
      return res.status(400).json({ error: 'Recipient does not exist.' });
    }

    const {
      product,
      recipient_id,
      deliverer_id,
      quantity,
    } = await Order.create(req.body);

    return res.json({ product, recipient_id, deliverer_id, quantity });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      product: Yup.string().max(150),
      started: Yup.bool(),
      ended: Yup.bool(),
    });
    /**
     * Verify if input fit in schema, returning scpecific message
     */
    const schemaVerify = await schema.validate(req.body).catch(err => {
      return err.message;
    });
    if (typeof schemaVerify === 'string') {
      return res.status(400).json({ error: schemaVerify });
    }

    const { id } = req.params;
    const { started, ended } = req.body;
    const date = new Date();
    const dateHour = getHours(date);

    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    /**
     * Deliverer start the transport
     * Time range: 8h -> 18h
     */
    if (started) {
      if (dateHour < 8 || dateHour > 22) {
        return res
          .status(401)
          .json({ error: 'You can only start order between 8 and 18 hours' });
      }
      await order.update({ start_date: date, started });
      return res.json({ start_date: order.start_date, started });
    }

    /**
     * Order delivered update
     */
    if (ended) {
      if (order.start_date === null) {
        return res
          .status(401)
          .json({ error: 'You can not finish an order that have not started' });
      }
      if (order.ended === true) {
        return res.status(401).json({ error: 'Order already finished' });
      }

      await order.update({ end_date: date, ended });

      return res.json({ end_date: order.end_date, ended });
    }

    const { product, signature_id } = await order.update(req.body);

    return res.json({ product, signature_id });
  }

  async delete(req, res) {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: Deliverer,
          as: 'deliverer',
          attributes: ['first_name', 'last_name', 'email'],
        },
        {
          model: Recipient,
          as: 'recipient',
          attributes: ['name'],
        },
      ],
    });

    /**
     * Verify if it's cancelable
     * Condition: deliverer still don't take the order
     */
    if (!(order.started === null)) {
      return res
        .status(400)
        .json({ error: 'Deliverer has already started order' });
    }
    const { canceled_at } = await order.update({ canceled_at: new Date() });

    await order.save();

    const cancellationDate = await format(
      canceled_at,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      {
        locale: pt,
      }
    );

    await Mail.sendMail({
      to: `${order.deliverer.first_name} <${order.deliverer.email}>`,
      subject: 'Agendamento Cancelado',
      template: 'cancellation',
      context: {
        deliverer: order.deliverer.first_name,
        recipient: order.recipient.name,
        date: cancellationDate,
        product: order.product,
        quantity: order.quantity,
      },
    });

    return res.json({ cancellationDate });
  }
}
export default new OrderController();
