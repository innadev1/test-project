import { connect } from 'react-redux'
import Clock from './clock'
import Counter from './counter'
import HelloWorld from './helloWorld'

function Examples ({ lastUpdate, light }) {
  return (
    <div>
      <Clock lastUpdate={lastUpdate} light={light} />
      {/* <Counter /> */}
      <HelloWorld />
    </div>
  )
}

function mapStateToProps (state) {
  const { lastUpdate, light } = state
  return { lastUpdate, light }
}

export default connect(mapStateToProps)(Examples)