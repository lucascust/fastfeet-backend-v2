import Sequelize, { Model } from 'sequelize';
import { isBefore, subDays } from 'date-fns';

class Order extends Model {
  static init(sequelize) {
    super.init(
      {
        signature_id: Sequelize.NUMBER,
        start_date: Sequelize.DATE,
        started: Sequelize.BOOLEAN,
        end_date: Sequelize.DATE,
        ended: Sequelize.BOOLEAN,
        canceled_at: Sequelize.DATE,
        product: Sequelize.STRING,
        quantity: Sequelize.NUMBER,
        past: {
          type: Sequelize.VIRTUAL,
          get() {
            return isBefore(this.end_date, new Date());
          },
        },
        cancelable: {
          type: Sequelize.VIRTUAL,
          get() {
            return isBefore(new Date(), subDays(this.end_date, 1));
          },
        },
      },
      {
        sequelize,
      }
    );
    return this;
  }

  // Relações
  static associate(models) {
    this.belongsTo(models.Deliverer, {
      foreignKey: 'deliverer_id',
      as: 'deliverer',
    });
    this.belongsTo(models.Recipient, {
      foreignKey: 'recipient_id',
      as: 'recipient',
    });
  }
}

export default Order;
