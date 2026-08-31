import {generators, Issuer} from 'openid-client';

let clientPromise;

function callbackUrl() {
  return process.env.APP_URL + '/oidc/callback';
}

async function client() {
  const {LOGTO_ISSUER, LOGTO_CLIENT_ID, LOGTO_CLIENT_SECRET} = process.env;
  if (!LOGTO_ISSUER || !LOGTO_CLIENT_ID || !LOGTO_CLIENT_SECRET || !process.env.APP_URL) {
    throw new Error('Logto environment is not configured');
  }
  clientPromise ||= Issuer.discover(LOGTO_ISSUER).then((issuer) => new issuer.Client({
    client_id: LOGTO_CLIENT_ID,
    client_secret: LOGTO_CLIENT_SECRET,
    redirect_uris: [callbackUrl()],
    response_types: ['code'],
  }));
  return clientPromise;
}

export async function login(req, res, next) {
  try {
    const oidc = await client();
    const state = generators.state();
    const nonce = generators.nonce();
    req.session.oidcState = state;
    req.session.oidcNonce = nonce;
    res.redirect(oidc.authorizationUrl({
      scope: process.env.LOGTO_SCOPES || 'openid profile email',
      response_type: 'code',
      state,
      nonce,
      redirect_uri: callbackUrl(),
    }));
  } catch (error) {
    next(error);
  }
}

export async function callback(req, res, next) {
  try {
    const oidc = await client();
    if (!req.session.oidcState || req.session.oidcState !== req.query.state) {
      return res.status(400).send('Ungültiger Login-Status. Bitte starte die Anmeldung erneut.');
    }
    const tokenSet = await oidc.callback(callbackUrl(), req.query, {
      state: req.session.oidcState,
      nonce: req.session.oidcNonce,
    });
    const claims = tokenSet.claims();
    const allowed = (process.env.LOGTO_ADMIN_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const email = String(claims.email || '').toLowerCase();
    if (!email || !allowed.includes(email)) {
      req.session = null;
      return res.status(403).send('Dieser Account ist nicht für die Redaktion freigeschaltet.');
    }
    req.session.user = {sub: claims.sub, name: claims.name || claims.email, email: claims.email};
    delete req.session.oidcState;
    delete req.session.oidcNonce;
    return res.redirect('/admin');
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.session?.user) return next();
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({error: 'Authentication required'});
  }
  return res.redirect('/auth/login');
}

export function logout(req, res) {
  req.session = null;
  res.redirect('/');
}
