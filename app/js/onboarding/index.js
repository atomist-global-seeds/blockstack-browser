import React from 'react'
import { browserHistory, withRouter } from 'react-router'
import PropTypes from 'prop-types'
import PanelShell, { renderItems } from '@components/PanelShell'
import { Email, Verify, Password, Username, Hooray } from './views'
import { encrypt } from '@utils/encryption-utils'

import bip39 from 'bip39'
import { randomBytes } from 'crypto'
const VIEWS = {
  EMAIL: 0,
  EMAIL_VERIFY: 1,
  PASSWORD: 2,
  USERNAME: 3,
  HOORAY: 4
}

const HEROKU_URL = 'https://obscure-retreat-87934.herokuapp.com'

const encryptSeedWithPassword = (password, seed) =>
  encrypt(new Buffer(seed), password).then(encrypted =>
    encrypted.toString('hex')
  )

const cacheEncryptedSeed = (username, encryptedSeed) => {
  let updated = []
  const cachedSeeds = localStorage.getItem('encryptedSeeds')

  if (cachedSeeds) {
    updated = [...JSON.parse(cachedSeeds)]
  }
  updated.push({ username, encryptedSeed })

  localStorage.setItem('encryptedSeeds', JSON.stringify(updated))
}

function verifyEmail(email) {
  const { protocol, hostname, port } = location
  const thisUrl = `${protocol}//${hostname}${port && `:${port}`}`
  const emailVerificationLink = `${thisUrl}/sign-up?verified=${email}`

  const options = {
    method: 'POST',
    body: JSON.stringify({
      email,
      emailVerificationLink
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }

  return fetch(`${HEROKU_URL}/verify`, options)
    .then(
      () => {
        console.log(`emailNotifications: sent ${email} an email verification`)
      },
      error => {
        console.log('emailNotifications: error', error)
      }
    )
    .catch(error => {
      console.log('emailNotifications: error', error)
    })
}

function sendRecovery(blockstackId, email, encryptedSeed) {
  const { protocol, hostname, port } = location
  const thisUrl = `${protocol}//${hostname}${port && `:${port}`}`
  const seedRecovery = `${thisUrl}/seed?encrypted=${encryptedSeed}`

  const options = {
    method: 'POST',
    body: JSON.stringify({
      email,
      seedRecovery,
      blockstackId
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }

  return fetch(`${HEROKU_URL}/recovery`, options)
    .then(
      () => {
        console.log(`emailNotifications: sent ${email} recovery email`)
      },
      error => {
        console.log('emailNotifications: error', error)
      }
    )
    .catch(error => {
      console.log('emailNotifications: error', error)
    })
}

function sendRestore(blockstackId, email, encryptedSeed) {
  const { protocol, hostname, port } = location
  const thisUrl = `${protocol}//${hostname}${port && `:${port}`}`
  const restoreLink = `${thisUrl}/sign-in?seed=${encryptedSeed}`

  const options = {
    method: 'POST',
    body: JSON.stringify({
      email,
      restoreLink,
      blockstackId
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }

  return fetch(`${HEROKU_URL}/restore`, options)
    .then(
      () => {
        console.log(`emailNotifications: sent ${email} restore email`)
      },
      error => {
        console.log('emailNotifications: error', error)
      }
    )
    .catch(error => {
      console.log('emailNotifications: error', error)
    })
}

class Onboarding extends React.Component {
  state = {
    email: '',
    password: '',
    username: '',
    seed: '',
    view: VIEWS.EMAIL
  }

  componentWillMount() {
    const { location } = this.props
    if (location.query.verified) {
      this.setState({ email: location.query.verified })
      this.updateView(VIEWS.PASSWORD)
    }
  }

  updateURL = view => {
    const historyChange = slug => {
      if (this.props.location.pathname !== `/sign-up/${slug}`) {
        return this.props.router.push(`/sign-up/${slug}`, this.state)
      } else {
        return null
      }
    }

    switch (view) {
      case VIEWS.EMAIL_VERIFY:
        return historyChange('verify')
      case VIEWS.PASSWORD:
        return historyChange('password')
      case VIEWS.USERNAME:
        return historyChange('username')
      case VIEWS.HOORAY:
        return historyChange('success')
      default:
        return null
    }
  }

  componentDidUpdate() {
    this.updateURL(this.state.view)
  }

  updateValue = (key, value) => {
    this.setState({ [key]: value })
  }

  updateView = view => this.setState({ view })

  // given foo@bar.com, returns foo
  retrieveUsernameFromEmail = email =>
    email.match(/^([^@]*)@/)[1].replace(/[^\w\s]/gi, '')

  submitPassword = () => {
    const { username, email } = this.state
    if (username.length < 1) {
      this.setState({
        username: this.retrieveUsernameFromEmail(email),
        email
      })
    }
    this.updateView(VIEWS.USERNAME)
  }

  submitUsername = () => {
    const { password, email, username } = this.state
    const seed = bip39.generateMnemonic(128, randomBytes)

    this.setState({ seed })

    encryptSeedWithPassword(password, seed).then(encryptedSeed => {
      sendRecovery(username, email, encryptedSeed)
      sendRestore(username, email, encryptedSeed)
      cacheEncryptedSeed(username, encryptedSeed)
    })

    this.updateView(VIEWS.HOORAY)
  }

  goToBackup = () => {
    browserHistory.push({
      pathname: '/seed',
      state: { seed: this.state.seed }
    })
  }

  submitEmailForVerification = () => {
    verifyEmail(this.state.email)
    this.updateView(VIEWS.EMAIL_VERIFY)
  }

  render() {
    const { email, password, username, view } = this.state

    const views = [
      {
        show: VIEWS.EMAIL,
        Component: Email,
        props: {
          email,
          next: this.submitEmailForVerification,
          updateValue: this.updateValue
        }
      },
      {
        show: VIEWS.EMAIL_VERIFY,
        Component: Verify,
        props: {
          email,
          resend: this.submitEmailForVerification,
          next: () => this.updateView(VIEWS.PASSWORD)
        }
      },
      {
        show: VIEWS.PASSWORD,
        Component: Password,
        props: {
          password,
          next: this.submitPassword,
          updateValue: this.updateValue
        }
      },
      {
        show: VIEWS.USERNAME,
        Component: Username,
        props: {
          username,
          next: this.submitUsername,
          previous: () => this.updateView(VIEWS.PASSWORD),
          updateValue: this.updateValue
        }
      },
      {
        show: VIEWS.HOORAY,
        Component: Hooray,
        props: {
          email,
          password,
          username,
          goToRecovery: this.goToBackup,
          goToApp: () => console.log('go to app!')
        }
      }
    ]

    return (
      <PanelShell>
        {renderItems(views, view)}
      </PanelShell>
    )
  }
}

Onboarding.propTypes = {
  location: PropTypes.object,
  router: PropTypes.object
}

export default withRouter(Onboarding)
