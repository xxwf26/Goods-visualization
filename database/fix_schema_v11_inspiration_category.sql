-- 灵感库分类重构：2类(product/craft) → 4类
-- packaging=包装结构, peripheral=周边品类灵感, effect=效果与特殊工艺, production=印刷与生产攻略
UPDATE inspiration SET inspiration_type = CASE
  WHEN inspiration_type = 'product' THEN 'peripheral'
  WHEN inspiration_type = 'craft' THEN 'effect'
  WHEN inspiration_type IN ('packaging','peripheral','effect','production') THEN inspiration_type
  ELSE 'peripheral'
END;

SELECT 'inspiration_type migrated to 4 categories' AS result;
