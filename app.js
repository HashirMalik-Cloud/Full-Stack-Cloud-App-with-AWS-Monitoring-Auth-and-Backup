// ===== app.js ===== 
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');
const path = require('path'); 
const helmet = require('helmet'); 
const bodyParser = require('body-parser');
const app = express();
// Middleware setup app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
// Session setup app.use(session({ 
secret: process.env.SESSION_SECRET || 'my-secret', resave: false, saveUninitialized: false }));
let client;
// Cognito OIDC client setup async function initializeClient() {
const issuer = await Issuer.discover('https://cognito-idp.us-east-1.amazonaws.com/us-east-1_uTr60lCD0');
client = new issuer.Client({ client_id: process.env.COGNITO_CLIENT_ID || 'your-client-id', client_secret: process.env.COGNITO_CLIENT_SECRET || 'your-client-secret', redirect_uris: [process.env.COGNITO_REDIRECT_URI || 'https://your-cloudfront-url.cloudfront.net/auth/callback'], response_types: ['code'] }); } initializeClient().catch(console.error);
// Auth middleware
const checkAuth = (req, res, next) => { req.isAuthenticated = !!req.session.userInfo; next(); };
// Home route 
app.get('/', checkAuth, (req, res) => { res.render('home', { isAuthenticated: req.isAuthenticated, userInfo: req.session.userInfo }); });
// Login route 
app.get('/login', (req, res) => { const nonce = generators.nonce(); const state = generators.state();
req.session.nonce = nonce; req.session.state = state;
const authUrl = client.authorizationUrl({ scope: 'openid email phone', state, nonce });
res.redirect(authUrl); });
// Callback route
app.get('/auth/callback', async (req, res) => { try { const params = client.callbackParams(req); const tokenSet = await client.callback( process.env.COGNITO_REDIRECT_URI || 'https://your-cloudfront-url.cloudfront.net/auth/callback', params, { nonce: req.session.nonce, state: req.session.state } );
const userInfo = await client.userinfo(tokenSet.access_token);
req.session.userInfo = userInfo;
res.redirect('/');
} catch (err) { console.error('Callback error:', err); res.send('❌ Something went wrong during login.'); } });
// Logout route 
app.get('/logout', (req, res) => { req.session.destroy(() => { const logoutUrl = 'https://us-east-1utr60lcd0.auth.us-east-1.amazoncognito.com/logout' + '?client_id=' + (process.env.COGNITO_CLIENT_ID || 'your-client-id') + '&logout_uri=' + (process.env.COGNITO_LOGOUT_URI || 'https://your-cloudfront-url.cloudfront.net/'); res.redirect(logoutUrl); }); });
// Form POST route to submit info 
app.post('/submit', (req, res) => { const { name, email } = req.body; console.log('Received data:', name, email); 
// Save to DB logic here (if connected) 
res.send('✅ Data saved successfully!'); });
// Start server 
const port = process.env.PORT || 80; app.listen(port, '0.0.0.0', () => { console.log(🌐 App running on port ${port}); });

