import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { setHelloWorld } from '../store'

class helloWorld extends Component {
    render () {
      const { helloWorld } = this.props
      return (
        <div>
          {helloWorld.title}
        </div>
      )
    }
  }

function mapStateToProps (state) {
  const { helloWorld } = state
  return { helloWorld }
}

const mapDispatchToProps = dispatch =>
  bindActionCreators({ setHelloWorld }, dispatch)

export default connect(mapStateToProps, mapDispatchToProps)(helloWorld)