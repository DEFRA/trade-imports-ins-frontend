import { buildNavigation } from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('renders exactly two links with no About entry', () => {
    const navigation = buildNavigation(mockRequest({ path: '/other' }))

    expect(navigation).toHaveLength(2)
    expect(navigation.map((item) => item.text)).toEqual([
      'Dashboard',
      'Address book'
    ])
    expect(navigation.some((item) => item.text === 'About')).toBe(false)
  })

  test('highlights Dashboard on /', () => {
    const navigation = buildNavigation(mockRequest({ path: '/' }))

    expect(navigation[0]).toEqual({
      text: 'Dashboard',
      href: '/',
      current: true
    })
    expect(navigation[1].current).toBe(false)
  })

  test('highlights Address book when path starts with /address-book', () => {
    const navigation = buildNavigation(
      mockRequest({ path: '/address-book/add' })
    )

    expect(navigation[1]).toEqual({
      text: 'Address book',
      href: '/address-book',
      current: true
    })
  })
})
