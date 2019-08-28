import React from 'react'
import style from '../src/sass/pages/_landingPage_2.scss'
import callBackStyle from '../src/components/callbackPopup/_callBackPopup.scss'
import slick from '../src/lib/slick.scss'
import { connect } from 'react-redux'
import NextSeo from 'next-seo'

import App from '../src/wrappers/pageWrapper'
import Header from '../src/components/header/header'
import LandingPageTop from '../src/components/newLandingPageComponents/landingPageTop/landingPageTop'
import {
  setLandingPageNew,
  setUltraDotsRequestForm,
  setUltraDotsHeader,
  setUltraDotsFooter,
  setUltraDotsBenefits,
  setUltraDotsDealsPage,
  setUltraDotsbookGuide,
  isPopupHide,
  setRequestForm,
  setCurrentLang,
  setUltraDotsReviewsBlock
} from '../src/store/actions'
import TasComponent from '../src/components/tasComponent/tasComponent'
import { isMobile } from 'react-device-detect'
import SaveDots from '../src/components/saveDots/saveDots'
import helpersUltra from '../src/helpers/ultraDotsHelper'
import LinePhone from '../src/components/linePhone/linePhone'
import DynamicComponent from '../src/components/dynamicComponent/dynamicComponent'
import { loadDynamicCallBack, loadDynamicForm } from '../src/services'
import LiveEditor from '../src/components/liveEditor/liveEditor'
import helpers from '../src/helpers/landingPageHelpers'
import pagesHelper from '../src/helpers/pagesHelper'
import Fade from 'react-reveal/Fade';
import loadable from '@loadable/component'

const NewsletterPopup = loadable(() => import('../src/components/newsletterPopupNew/newsletterPopup'))
const LandingPageBook = loadable(() => import('../src/components/newLandingPageComponents/landingPageBook/landingPageBook'))
const LandingPagePrices = loadable(() => import('../src/components/newLandingPageComponents/landingPagePrices/landingPagePrices'))
const BenefitsBlock = loadable(() => import('../src/components/benefitsBlock/benefitsBlock'))
const ReviewsBlock = loadable(() => import('../src/components/reviewsBlock/reviewsBlock'))
const LandingPageInfo = loadable(() => import('../src/components/newLandingPageComponents/landingPageInfo/landingPageInfo'))
const CookiesPopup = loadable(() => import('../src/components/cookiesPopup/cookiesPopup'))
const Footer = loadable(() => import('../src/components/footer/footer'))

const sliderSettings = {
  dots: true,
  infinite: true,
  speed: 500,
  slidesToShow: 3,
  slidesToScroll: 3,
  vertical: false,
  arrows: false,
  responsive: [
    {
      breakpoint: 1025,
      settings: {
        slidesToShow: 2,
        slidesToScroll: 2
      }
    },
    {
      breakpoint: 760,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1
      }
    }
  ]
}

function preparePrices(prices, sectionId, code, type, currentLang = 'uk', baseUrl) {

  return fetch(`${baseUrl}/pricesForSpecialOffers?landing=US&locale=${currentLang}&code=${code}&type=${type}`)
    .then(response => response.json())
    .then(({ response: { data } }) => prepareData(data, prices, sectionId))
    .catch(err => console.log('err--->', err))
}

function prepareData(data, prices, sectionId){
  // price sorting
  let cityId = `section-${sectionId}_business-class-deals-cities-`
  let priceId_b = `section-${sectionId}_business-class-deals-price_b-`
  let priceId_f = `section-${sectionId}_business-class-deals-price_f-`
  const dataLength = 10
  for (let i = 1; i <= dataLength; i += 1) {
    let city = prices[`${cityId}${i}`]
      .replace(/&amp;/g, '&')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .toLowerCase()

    if (data[city]) {
      prices.isShow = true
      prices[`${priceId_b}${i}`] = Number(
        pagesHelper.roundPrice(data[city]['price_b'])
      ).toLocaleString('en')
      prices[`${priceId_f}${i}`] = Number(
        pagesHelper.roundPrice(data[city]['price_f'])
      ).toLocaleString('en')
    }
  }
  return prices
}

class newLandingPage2 extends React.Component {
  state = {
    formLoaded: false,
    reviewsLoaded: false,
    showNSpopup: true
  }

  setLandingPageNewData = data => {
    const { dispatch } = this.props
    dispatch(setLandingPageNew(data))
  }

  static async getInitialProps({
    reduxStore,
    query: {
      country,
      city,
      region,
      isDev,
      data,
      sectionId,
      pageLocale,
      isDynamicPrices,
      adminMeta,
      adminPageType },
    req
  }) {
    const dev = process.env.NODE_ENV !== 'production'
    const protocols = !dev && ~req.get('Host').indexOf('skyluxtravel.com') ? 'https' : 'http'
    const baseUrl = req ? `${protocols}://${req.get('Host')}` : ''
    const landingType =
      (region && 'region') || (country && 'country') || (city && 'city') || 'default'

    const folder = 'skyluxtravel_popups_grey'
    const dynamicData = await helpers.buildDynamicData({ region, country, city, airline: null, folder }, baseUrl)

    const isDynamic = !!(country || city || region || false)
    const metaType = (region && 'region') || (country && 'country') || (city && 'city') || 'admin'
    let meta = helpers.setMeta(metaType, dynamicData)
    if (metaType === 'admin') {
      meta = adminMeta
    }

    req = req || {}
    req.headers = req.headers || {}
    const cookiesData = req.headers.cookie
    const code =
      (!!city && city.cityCode) ||
      (!!country && country.countryCode) ||
      (!!region && region.regionCode) ||
      sectionId

    /* Fetch ultra dots */
    const txt = ['bussinessClassDeals']
    const uni = ['header', 'footer', 'requestForm', 'benefits', 'bookGuide', 'reviewsBlock']
    const prices = ['bussinessClassDeals']
    // fetch default texts (from initialState)
    const initTexts = await helpersUltra.getInitialTexts(reduxStore, {
      texts: txt,
      universal: uni,
      prices: prices
    })

    sectionId = sectionId || `${code}bcdl`

    const texts = await helpersUltra.getTexts(initTexts, sectionId, baseUrl)

    reduxStore.dispatch(setUltraDotsRequestForm({ universal: texts.universal_requestForm }))
    reduxStore.dispatch(setUltraDotsBenefits({ universal: texts.universal_benefits }))
    reduxStore.dispatch(setUltraDotsDealsPage({ texts: texts.texts }))
    reduxStore.dispatch(setUltraDotsHeader({ universal: texts.universal_header }))
    reduxStore.dispatch(setUltraDotsbookGuide({ universal: texts.universal_bookGuide }))
    reduxStore.dispatch(setUltraDotsFooter({ universal: texts.universal_footer }))
    reduxStore.dispatch(setUltraDotsReviewsBlock({ universal: texts.universal_reviewsBlock }))
    let landingPrices = texts.prices

    landingPrices = await preparePrices(
      landingPrices,
      sectionId,
      code,
      landingType,
      'uk',
      baseUrl
      )
    reduxStore.dispatch(setUltraDotsDealsPage({ prices: landingPrices, texts: texts.texts }))

    pageLocale = pageLocale || reduxStore.getState().currentLang
    if (reduxStore.getState().currentLang !== pageLocale)
      reduxStore.dispatch(setCurrentLang(pageLocale))

    return {
      landingType,
      dynamicData,
      code,
      baseUrl,
      country,
      city,
      region,
      isDev,
      data,
      sectionId,
      isDynamicPrices,
      pageLocale,
      meta,
      adminPageType,
      cookiesData,
      isDynamic
    }
  }

  updateRequestForm(data) {
    const { dispatch } = this.props
    dispatch(setRequestForm(data))
  }

  async componentDidMount() {
    const { dispatch, pageType, isDev } = this.props
    window.page_type = pageType

    this.updateRequestForm({
      from_dev: isDev ? '1' : '0',
      showForm: !isMobile
    })
    // check NS popup
    const showNSpopup = await dispatch(isPopupHide(this.props.cookiesData, window))

    this.setState({
      showNSpopup: showNSpopup
    })
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.requestForm.showForm !== this.props.requestForm.showForm) {
      this.setState({
        formLoaded: true
      })
    }
  }

  onClickPrice() {
    if (document) {
      const elem = document.getElementsByClassName('requestForm')[0] || document.body
      elem.scrollIntoView({ behavior: 'smooth' })
    }
  }

  render() {
    const {
      sectionId,
      meta,
      adminPageType,
      cookiesData,
      currentLang,
      requestForm,
      baseUrl,
      code,
      dynamicData,
      landingType
    } = this.props
    const pageType = this.props.isDynamic ? 'dynamic_landing_deals' : adminPageType
    const keyPrefix = `section-${sectionId}_`
    const ultraPrefix = currentLang !== 'en' ? `${currentLang}_` : ''

    return (
      <>
        <TasComponent />
        <LinePhone cookie={cookiesData} />
        <style dangerouslySetInnerHTML={{ __html: style }} />
        <style dangerouslySetInnerHTML={{ __html: slick }} />
        <style dangerouslySetInnerHTML={{ __html: callBackStyle }} />
        <NextSeo config={meta} />
        <CookiesPopup />
        <div className="grey-background">
          <div className="landing-page-2">
            <Header pageType={pageType} ultraPrefix={ultraPrefix} />
            <DynamicComponent
              pageType={pageType}
              loaded={requestForm.active}
              spinner={false}
              component={loadDynamicCallBack}
            />
            {!this.state.showNSpopup && <NewsletterPopup />}
            <div className="new-landing-page-top">
              <LandingPageTop
                keyPrefix={keyPrefix}
                ultraPrefix={ultraPrefix}
                dynamicData={dynamicData}
                landingType={landingType}
              />
              <div className={isMobile && !!requestForm.showForm ? 'right active' : 'right'}>
                <DynamicComponent
                  pageType={pageType}
                  componentProps={{
                    showCallBack: true,
                    showHelpText: false,
                    showHSeparate: true,
                    showPrevText: false
                  }}
                  formUpdated={true}
                  loaded={this.state.formLoaded}
                  spinner={true}
                  formUpdated={true}
                  component={loadDynamicForm}
                />
              </div>
            </div>
            <Fade left>
              <LandingPageBook ultraPrefix={ultraPrefix} keyPrefix={keyPrefix} />
            </Fade>
            <LandingPagePrices
              onClick={this.onClickPrice.bind(this)}
              keyPrefix={keyPrefix}
              dynamicData={dynamicData}
              landingType={landingType}
              code={code}
              type={landingType}
            />
            <Fade left>
              <BenefitsBlock ultraPrefix={ultraPrefix} sliderSettings={sliderSettings} />
            </Fade>
            <Fade left>
              <div className="reviews-block">
                <div className="reviews-block-header">
                  <div className="title">
                    <LiveEditor domain="bussinessClassDeals" section="texts" k="happyCustomers" prefix={keyPrefix} />
                  </div>
                </div>
                <div className="reviews-block-reviews">
                  <ReviewsBlock
                    ultraPrefix={ultraPrefix}
                    componentProps={{
                      showPartnersLogo: false,
                      showTrustPilot: true,
                      showAuthor: true,
                      showStars: true,
                      showButton: false
                    }}
                    slickSetting={{
                      autoplay: true,
                      desktop: {
                        slidesToShow: 1
                      },
                      tablet: {
                        slidesToShow: 1
                      }
                    }}
                  />
                </div>
              </div>
            </Fade>
            <LandingPageInfo keyPrefix={keyPrefix} />
            <Footer ultraPrefix={ultraPrefix} />
          </div>
        </div>
        <SaveDots
          cookies={cookiesData}
          baseUrl={baseUrl}
          templateName={[
            'requestForm',
            'benefits',
            'reviewsBlock',
            'bussinessClassDeals',
            'bookGuide'
          ]}
        />
      </>
    )
  }
}

function mapStateToProps(state) {
  const { newLandingPage2, requestForm, currentLang } = state
  return { newLandingPage2, requestForm, currentLang }
}

export default App(connect(mapStateToProps)(newLandingPage2))
