-- =========================================================
-- SONORA — ESQUEMA DO BANCO DE DADOS (PostgreSQL)
--
-- Como usar no pgAdmin 4:
--   1. Crie um banco chamado "sonora"
--      (botão direito em Databases → Create → Database...)
--   2. Selecione o banco "sonora" e abra o Query Tool
--   3. Abra este arquivo (ou cole o conteúdo) e execute (F5)
--
-- O script pode ser executado mais de uma vez sem apagar dados:
-- ele só cria o que ainda não existe (tabelas, colunas e o
-- catálogo inicial dos modelos X-01 a X-04).
-- =========================================================


-- ---------------------------------------------------------
-- USUÁRIOS
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(254) NOT NULL,
    phone         VARCHAR(20),
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Papel da conta: "customer" (cliente) ou "admin" (acessa o painel
-- administrativo). Para tornar alguém admin:  npm run admin -- email@exemplo.com
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'customer';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'admin'));

-- E-mail único sem diferenciar maiúsculas de minúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
    ON users (lower(email));


-- Atualiza "updated_at" automaticamente em cada UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------
-- RECUPERAÇÃO DE SENHA
-- Cada link enviado por e-mail vale 1 hora e uma única vez.
-- Guarda só o hash (SHA-256) do código do link, nunca o código.
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS password_resets (
    id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash CHAR(64)    NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_resets_user_idx
    ON password_resets (user_id, created_at DESC);


-- ---------------------------------------------------------
-- PRODUTOS (CATÁLOGO)
-- Fonte única do catálogo: o site lê tudo daqui pela rota
-- GET /api/products, e o servidor calcula o total dos pedidos
-- com estes preços (nunca com valores vindos do navegador).
--
--   products              dados que não mudam com o idioma
--   product_translations  textos em português (pt) e inglês (en)
--   product_images        fotos da galeria, na ordem de exibição
--
-- Os INSERTs abaixo só criam o catálogo INICIAL: rodar este
-- arquivo de novo não apaga o que foi editado depois. Preço,
-- textos e status de venda se mudam pelo painel administrativo
-- (admin.html) ou com um UPDATE no pgAdmin.
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY,
    code            VARCHAR(10)   NOT NULL UNIQUE,
    name            VARCHAR(120)  NOT NULL,
    series          VARCHAR(60)   NOT NULL,
    price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_active       BOOLEAN       NOT NULL DEFAULT true
);

-- Produtos criados pelo painel ganham o próximo id sozinhos.
-- (Os modelos iniciais têm id fixo; a sequência continua depois do maior.)
CREATE SEQUENCE IF NOT EXISTS products_id_seq OWNED BY products.id;
ALTER TABLE products ALTER COLUMN id SET DEFAULT nextval('products_id_seq');

-- Colunas novas (bancos criados antes desta versão também as recebem).
ALTER TABLE products ADD COLUMN IF NOT EXISTS subtitle        VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order      INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS story_eyebrow   VARCHAR(60)  NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS story_title     VARCHAR(60)  NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS story_highlight VARCHAR(60)  NOT NULL DEFAULT '';

-- Estoque: quantas unidades ainda podem ser vendidas.
-- NULL = sem controle de estoque (vende sempre). 0 = esgotado.
-- Cada pedido reserva as unidades; pagamento expirado ou pedido
-- cancelado devolve. Muda pelo painel administrativo.
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_check;
ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock IS NULL OR stock >= 0);

-- Textos de marca (subtitle, story_*) ficam em inglês nos dois idiomas.
INSERT INTO products (id, code, name, series, subtitle, price, sort_order, story_eyebrow, story_title, story_highlight) VALUES
    (1, 'X-01', 'SONORA X-01', 'FUTURE SERIES', 'A new perspective on the future.', 899.90, 1, 'BEYOND THE ORDINARY', 'NOT MADE TO', 'BLEND IN.'),
    (2, 'X-02', 'SONORA X-02', 'SIGNATURE SERIES', 'Precision in motion.', 1099.90, 2, 'ENGINEERED EMOTION', 'BUILT FOR', 'MOTION.'),
    (3, 'X-03', 'SONORA X-03', 'LIMITED LAB', 'Experimental by nature.', 1299.90, 3, 'LIMITED LAB / 003', 'BORN IN', 'THE LAB.'),
    (4, 'X-04', 'SONORA X-04', 'STUDIO SERIES', 'Urban form, redefined.', 799.90, 4, 'FROM STUDIO TO STREET', 'THE CITY,', 'REFRAMED.')
ON CONFLICT (id) DO NOTHING;

-- A sequência sempre começa depois do maior id existente.
SELECT setval('products_id_seq', GREATEST((SELECT max(id) FROM products), 1));


CREATE TABLE IF NOT EXISTS product_translations (
    product_id  INTEGER     NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    lang        VARCHAR(2)  NOT NULL CHECK (lang IN ('pt', 'en')),
    tagline     VARCHAR(160) NOT NULL,
    description TEXT        NOT NULL,
    concept     TEXT        NOT NULL,
    materials   TEXT        NOT NULL,
    story_text  TEXT        NOT NULL,
    -- Lista de pares [rótulo, valor], ex.: [["Linha", "Future Series"]]
    specs       JSONB       NOT NULL DEFAULT '[]',
    PRIMARY KEY (product_id, lang)
);

INSERT INTO product_translations
    (product_id, lang, tagline, description, concept, materials, story_text, specs)
VALUES
    (1, 'pt',
        'Escultural. Minimalista. Inconfundível.',
        'Uma exploração de formas, proporções e identidade. O X-01 traduz a visão da SONORA em uma silhueta escultural que desafia o design convencional.',
        'Um par de óculos inspirado na interseção entre design industrial, moda e cultura visual.',
        'A composição definitiva ainda não foi definida. Os materiais serão especificados conforme o desenvolvimento do conceito do produto.',
        'O X-01 representa o ponto de partida da visão SONORA: transformar um objeto cotidiano em uma expressão de identidade, forma e experimentação.',
        '[["Linha","Future Series"],["Modelo","X-01"],["Categoria","Óculos de design futurista"],["Formato","Máscara panorâmica"]]'),
    (2, 'pt',
        'Geometria e movimento em equilíbrio.',
        'Linhas tensionadas e uma armação de perfil baixo definem o X-02. Um desenho que equilibra precisão geométrica e fluidez, pensado para acompanhar quem está sempre em movimento.',
        'Inspirado na linguagem da engenharia esportiva, o X-02 reduz a estrutura ao essencial e deixa a geometria conduzir o olhar.',
        'A composição definitiva ainda não foi definida. Os materiais serão especificados conforme o desenvolvimento do conceito do produto.',
        'O X-02 nasce do encontro entre técnica e expressão: cada ângulo foi desenhado para transmitir velocidade, mesmo quando está parado.',
        '[["Linha","Signature Series"],["Modelo","X-02"],["Categoria","Óculos de design esportivo"],["Formato","Meio aro envolvente"]]'),
    (3, 'pt',
        'A vanguarda da ótica experimental.',
        'Produzido em tiragem limitada, o X-03 é o laboratório da SONORA em forma de objeto. Volumes contínuos e lentes envolventes criam uma presença impossível de ignorar.',
        'Uma peça experimental que testa os limites entre óculos, escultura e tecnologia vestível.',
        'A composição definitiva ainda não foi definida. Os materiais serão especificados conforme o desenvolvimento do conceito do produto.',
        'O X-03 é onde a SONORA testa o futuro antes de todo mundo: uma edição limitada que transforma experimentação em objeto.',
        '[["Linha","Limited Lab"],["Modelo","X-03"],["Categoria","Óculos de design experimental"],["Edição","Limitada"]]'),
    (4, 'pt',
        'Uma nova leitura do design urbano.',
        'O X-04 nasce no estúdio e ganha as ruas. Uma lente panorâmica de tom violeta e uma armação translúcida reinterpretam a paisagem urbana com leveza e personalidade.',
        'Uma releitura da cidade como fonte de forma: superfícies limpas, transparência e contraste, traduzidos em um objeto para o dia a dia.',
        'A composição definitiva ainda não foi definida. Os materiais serão especificados conforme o desenvolvimento do conceito do produto.',
        'O X-04 observa a cidade por outro ângulo: um objeto de estúdio pensado para o ritmo, a luz e o movimento das ruas.',
        '[["Linha","Studio Series"],["Modelo","X-04"],["Categoria","Óculos de design urbano"],["Formato","Lente única panorâmica"]]'),
    (1, 'en',
        'Sculptural. Minimal. Unmistakable.',
        'An exploration of form, proportion and identity. The X-01 translates the SONORA vision into a sculptural silhouette that challenges conventional design.',
        'An eyewear piece inspired by the intersection of industrial design, fashion and visual culture.',
        'The final composition has not been defined yet. Materials will be specified as the product concept develops.',
        'The X-01 is the starting point of the SONORA vision: turning an everyday object into an expression of identity, form and experimentation.',
        '[["Line","Future Series"],["Model","X-01"],["Category","Futuristic design eyewear"],["Shape","Panoramic shield"]]'),
    (2, 'en',
        'Geometry and motion in balance.',
        'Taut lines and a low-profile frame define the X-02. A design that balances geometric precision and flow, made to keep up with those who are always on the move.',
        'Inspired by the language of sports engineering, the X-02 reduces the structure to the essentials and lets geometry lead the eye.',
        'The final composition has not been defined yet. Materials will be specified as the product concept develops.',
        'The X-02 is born where technique meets expression: every angle was drawn to convey speed, even when standing still.',
        '[["Line","Signature Series"],["Model","X-02"],["Category","Sport design eyewear"],["Shape","Wraparound half-rim"]]'),
    (3, 'en',
        'The cutting edge of experimental optics.',
        'Made in a limited run, the X-03 is the SONORA lab in the form of an object. Continuous volumes and wraparound lenses create a presence that is impossible to ignore.',
        'An experimental piece that tests the limits between eyewear, sculpture and wearable technology.',
        'The final composition has not been defined yet. Materials will be specified as the product concept develops.',
        'The X-03 is where SONORA tests the future before everyone else: a limited edition that turns experimentation into an object.',
        '[["Line","Limited Lab"],["Model","X-03"],["Category","Experimental design eyewear"],["Edition","Limited"]]'),
    (4, 'en',
        'A new take on urban design.',
        'The X-04 is born in the studio and takes to the streets. A violet-tinted panoramic lens and a translucent frame reinterpret the urban landscape with lightness and personality.',
        'A reinterpretation of the city as a source of form: clean surfaces, transparency and contrast, translated into an everyday object.',
        'The final composition has not been defined yet. Materials will be specified as the product concept develops.',
        'The X-04 looks at the city from another angle: a studio object designed for the rhythm, light and movement of the streets.',
        '[["Line","Studio Series"],["Model","X-04"],["Category","Urban design eyewear"],["Shape","Single panoramic lens"]]')
ON CONFLICT (product_id, lang) DO NOTHING;


-- A posição 1 é a capa (usada no catálogo, na sacola e nos pedidos).
-- Arquivos em public/assets/products/<modelo>/<ordem>-<ângulo>.<extensão>
CREATE TABLE IF NOT EXISTS product_images (
    product_id INTEGER      NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    position   SMALLINT     NOT NULL CHECK (position > 0),
    src        VARCHAR(200) NOT NULL,
    alt_pt     VARCHAR(160) NOT NULL,
    alt_en     VARCHAR(160) NOT NULL,
    PRIMARY KEY (product_id, position)
);

INSERT INTO product_images (product_id, position, src, alt_pt, alt_en) VALUES
    (1, 1, 'assets/products/x-01/01-three-quarter.jpg', 'SONORA X-01 em vista três-quartos', 'SONORA X-01 in three-quarter view'),
    (1, 2, 'assets/products/x-01/02-front.jpg', 'SONORA X-01 em vista frontal', 'SONORA X-01 in front view'),
    (1, 3, 'assets/products/x-01/03-top.jpg', 'SONORA X-01 visto de cima', 'SONORA X-01 seen from above'),
    (2, 1, 'assets/products/x-02/01-three-quarter.png', 'SONORA X-02 em vista três-quartos', 'SONORA X-02 in three-quarter view'),
    (3, 1, 'assets/products/x-03/01-three-quarter.jpg', 'SONORA X-03 em vista três-quartos', 'SONORA X-03 in three-quarter view'),
    (3, 2, 'assets/products/x-03/02-front.jpg', 'SONORA X-03 em vista frontal', 'SONORA X-03 in front view'),
    (3, 3, 'assets/products/x-03/03-top.jpg', 'SONORA X-03 visto de cima', 'SONORA X-03 seen from above'),
    (4, 1, 'assets/products/x-04/01-three-quarter.jpg', 'SONORA X-04 em vista três-quartos', 'SONORA X-04 in three-quarter view')
ON CONFLICT (product_id, position) DO NOTHING;


-- ---------------------------------------------------------
-- PEDIDOS
-- user_id é opcional: compras sem login também são salvas.
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    number          VARCHAR(20)   UNIQUE,
    user_id         INTEGER       REFERENCES users (id) ON DELETE SET NULL,

    customer_name   VARCHAR(120)  NOT NULL,
    customer_email  VARCHAR(254)  NOT NULL,
    customer_phone  VARCHAR(20)   NOT NULL,

    cep             VARCHAR(9)    NOT NULL,
    street          VARCHAR(160)  NOT NULL,
    street_number   VARCHAR(20)   NOT NULL,
    complement      VARCHAR(120),
    district        VARCHAR(120)  NOT NULL,
    city            VARCHAR(120)  NOT NULL,
    state           CHAR(2)       NOT NULL,

    payment_method  VARCHAR(10)   NOT NULL
        CHECK (payment_method IN ('pix', 'card', 'boleto')),
    status          VARCHAR(20)   NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled')),

    subtotal        NUMERIC(10,2) NOT NULL,
    discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
    total           NUMERIC(10,2) NOT NULL,

    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx
    ON orders (user_id, created_at DESC);

-- Pagamento com cartão (Stripe, modo de teste):
--   awaiting_payment  pedido criado, cliente pagando na página do Stripe
--   payment_expired   desistiu ou o prazo do pagamento acabou
-- Esses dois estados não aparecem no histórico do cliente.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255) UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at           TIMESTAMPTZ;

-- Quando o status mudou pela última vez (painel administrativo).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

-- Idioma do site na hora da compra: o e-mail de confirmação vai nele.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lang VARCHAR(2) NOT NULL DEFAULT 'pt';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
    'awaiting_payment', 'payment_expired',
    'confirmed', 'shipped', 'delivered', 'cancelled'
));


-- Itens do pedido guardam nome e preço da época da compra,
-- então o histórico não muda se o catálogo mudar depois.
CREATE TABLE IF NOT EXISTS order_items (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id     INTEGER       NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id   INTEGER       NOT NULL REFERENCES products (id),
    product_name VARCHAR(120)  NOT NULL,
    unit_price   NUMERIC(10,2) NOT NULL,
    quantity     INTEGER       NOT NULL CHECK (quantity BETWEEN 1 AND 99)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx
    ON order_items (order_id);


-- ---------------------------------------------------------
-- SESSÕES DE LOGIN
-- Tabela usada pelo pacote connect-pg-simple.
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS session (
    sid    VARCHAR      NOT NULL PRIMARY KEY,
    sess   JSON         NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS session_expire_idx
    ON session (expire);


-- ---------------------------------------------------------
-- SACOLA E FAVORITOS DA CONTA
-- Com login, a sacola e os favoritos ficam salvos aqui:
-- somem do navegador ao sair e voltam ao entrar de novo
-- (inclusive em outro computador).
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS cart_items (
    user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id INTEGER     NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    quantity   INTEGER     NOT NULL CHECK (quantity BETWEEN 1 AND 99),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS favorites (
    user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id INTEGER     NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);
