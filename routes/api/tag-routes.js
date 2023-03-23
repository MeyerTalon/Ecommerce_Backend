const router = require('express').Router();
const { Tag, Product, ProductTag } = require('../../models');

// The `/api/tags` endpoint

router.get('/', async (req, res) => {
  try {
    const tagData = await Tag.findAll({
      include: [{ model: Product, through: ProductTag}]
    });
    res.status(200).json(tagData);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Needs fixing, stops server when no data is found
router.get('/:id', async (req, res) => {
  try {
    const tagData = await Tag.findByPk(req.params.id ,{
      include: [{ model: Product, through: ProductTag}]
    });

    if (!tagData) {
      res.status(404).json({ message: 'Tag data not found :('});
    }
    res.status(200).json(tagData);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post('/', async (req, res) => {
  try {
    const tagData = await Tag.create(req.body);

    if (req.body.productIds.length) {
      const productTagIdArr = req.body.productIds.map((product_id) => {
        return {
          tag_id: tagData.id,
          product_id,
        };
      });
      const tagProductIds = await ProductTag.bulkCreate(productTagIdArr);
      res.status(200).json(tagProductIds);
    } else {
      res.status(200).json(tagData);
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

router.put('/:id', (req, res) => {
  Tag.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((tag) => {
      return ProductTag.findAll({ where: { tag_id: req.params.id } });
    })
    .then((productTags) => {
      // get list of current tag_ids
      const productTagIds = productTags.map(({ product_id }) => product_id);
      // create filtered list of new tag_ids
      const newProductTags = req.body.productIds
        .filter((product_id) => !productTagIds.includes(product_id))
        .map((product_id) => {
          return {
            tag_id: req.params.id,
            product_id,
          };
        });
      // figure out which ones to remove
      const productTagsToRemove = productTags
        .filter(({ product_id }) => !req.body.productIds.includes(product_id))
        .map(({ id }) => id);

      // run both actions
      return Promise.all([
        ProductTag.destroy({ where: { id: productTagsToRemove } }),
        ProductTag.bulkCreate(newProductTags),
      ]);
    })
    .then((updatedProductTags) => res.json(updatedProductTags))
    .catch((err) => {
      // console.log(err);
      res.status(400).json(err);
    });
});

router.delete('/:id', async (req, res) => {
  // delete on tag by its `id` value
  try {
    const tagData = await Tag.destroy({
      where: {
        id: req.params.id
      }
    });

    if (!tagData) {
      res.status(404).json({ message: 'Tag data not found :('});
      return;
    }

    const productTags = await ProductTag.destroy({ where: { tag_id: req.params.id } });

    res.status(200).json(tagData);
  }  catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
