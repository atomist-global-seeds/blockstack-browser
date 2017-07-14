import React, { Component, PropTypes } from 'react'
import Modal from 'react-modal'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'

import Alert from '../components/Alert'
import { AccountActions } from '../account/store/account'
import { SettingsActions } from '../account/store/settings'
import { isBackupPhraseValid } from '../utils'

import { PairBrowserView, LandingView,
  NewInternetView, RestoreView, DataControlView,
  CreateIdentityView, WriteDownKeyView, ConfirmIdentityKeyView,
  EnterEmailView } from './components'


const WRITE_DOWN_KEY_PAGE = 4

const TESTING_IDENTITY_KEY =
'biology amazing joke rib defy emotion fruit ecology blanket absent ivory bird'

function mapStateToProps(state) {
  return {
    api: state.settings.api,
    promptedForEmail: state.account.promptedForEmail,
    encryptedBackupPhrase: state.account.encryptedBackupPhrase
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(Object.assign({}, AccountActions, SettingsActions), dispatch)
}

class WelcomeModal extends Component {
  static propTypes = {
    accountCreated: PropTypes.bool.isRequired,
    storageConnected: PropTypes.bool.isRequired,
    coreConnected: PropTypes.bool.isRequired,
    closeModal: PropTypes.func.isRequired,
    updateApi: PropTypes.func.isRequired,
    api: PropTypes.object.isRequired,
    emailKeychainBackup: PropTypes.func.isRequired,
    promptedForEmail: PropTypes.bool.isRequired,
    encryptedBackupPhrase: PropTypes.string,
    initializeWallet: PropTypes.func.isRequired
  }

  constructor(props) {
    super(props)

    let startingPage = 0
    if (this.props.accountCreated) {
      startingPage = WRITE_DOWN_KEY_PAGE
    }
    this.state = {
      accountCreated: this.props.accountCreated,
      storageConnected: this.props.storageConnected,
      coreConnected: this.props.coreConnected,
      pageOneView: 'create',
      alerts: [],
      disableCreateAccountButton: false,
      email: '',
      page: startingPage
    }

    this.showNewInternetView = this.showNewInternetView.bind(this)
    this.showRestoreView = this.showRestoreView.bind(this)
    this.showNextView = this.showNextView.bind(this)
    this.createIdentity = this.createIdentity.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      accountCreated: nextProps.accountCreated,
      storageConnected: nextProps.storageConnected,
      coreConnected: nextProps.coreConnected
    })

    if (this.props.accountCreated) {
      this.setState({
        page: WRITE_DOWN_KEY_PAGE
      })
    }
  }

  onValueChange(event) {
    this.setState({
      [event.target.name]: event.target.value
    })
  }

  createIdentity(event) {
    event.preventDefault()
    // TODO: we're removing password, so hardcoding password until we refactor
    this.props.initializeWallet('password', null)
  }

  restoreAccount() {
    const { isValid, error } = isBackupPhraseValid(this.state.backupPhrase)

    if (!isValid) {
      this.updateAlert('danger', error)
      return
    }
    // TODO: we're removing password, so hardcoding password until we refactor
    this.props.initializeWallet('password', this.state.backupPhrase)
  }

  showNewInternetView(event)  {
    event.preventDefault()
    this.setState({
      pageOneView: 'newInternet',
      page: 1
    })
  }

  showRestoreView(event)  {
    event.preventDefault()
    this.setState({
      pageOneView: 'restore',
      page: 1
    })
  }

  showNextView(event)  {
    if (event) {
      event.preventDefault()
    }

    this.setState({
      page: this.state.page + 1
    })
  }

  emailKeychainBackup(event) {
    event.preventDefault()
    this.props.emailKeychainBackup(this.state.email, this.props.encryptedBackupPhrase)
    return false
  }

  skipEmailBackup(event) {
    event.preventDefault()
    this.props.skipEmailBackup()
  }

  updateAlert(alertStatus, alertMessage) {
    this.setState({
      alerts: [{ status: alertStatus, message: alertMessage }]
    })
  }

  render() {
    const isOpen = !this.state.accountCreated ||
      !this.state.coreConnected || !this.props.promptedForEmail

    const needToPair = !this.state.coreConnected

    const page =  this.state.page
    const pageOneView = this.state.pageOneView

    return (
      <div className="">
        <Modal
          isOpen={isOpen}
          onRequestClose={this.props.closeModal}
          contentLabel="Welcome Modal"
          shouldCloseOnOverlayClick={false}
          style={{ overlay: { zIndex: 10 } }}
          className="container-fluid"
        >
          {needToPair ?
            <PairBrowserView />
          :
            <div>
              <div>
              {page === 0 ?
                <LandingView
                  showNewInternetView={this.showNewInternetView}
                  showRestoreView={this.showRestoreView}
                />
              : null}
              </div>
              <div>
                {
                  page === 1 ?
                    <div>
                    {
                        pageOneView === 'newInternet' ?
                          <NewInternetView
                            showNextView={this.showNextView}
                          />
                        :
                          <div>restore</div>
                    }
                    </div>
                  :
                  null
                }
              </div>
              <div>
              {
                page === 2 ?
                  <DataControlView
                    showNextView={this.showNextView}
                  />
                :
                null
              }
              </div>
              <div>
              {
                page === 3 ?
                  <CreateIdentityView
                    createIdentity={this.createIdentity}
                  />
                :
                null
              }
              </div>
              <div>
              {
                page === WRITE_DOWN_KEY_PAGE ?
                  <WriteDownKeyView
                    identityKeyPhrase={TESTING_IDENTITY_KEY} // TODO: replace w/ real key
                    showNextView={this.showNextView}
                  />
                :
                null
              }
              </div>
              <div>
              {
                page === 5 ?
                  <ConfirmIdentityKeyView
                    identityKeyPhrase={TESTING_IDENTITY_KEY}
                    showNextView={this.showNextView}
                  />
                :
                null
              }
              </div>
              <div>
              {
                page === 6 ?
                  <EnterEmailView
                    skipEmailBackup={this.props.skipEmailBackup}
                  />
                :
                null
              }
              </div>
            </div>
          }
        </Modal>
      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(WelcomeModal)
