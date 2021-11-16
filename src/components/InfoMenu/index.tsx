import styled from 'styled-components/macro'
import { Calendar, Zap, PlusCircle, Award, AlignJustify, StopCircle, Grid } from 'react-feather'
import { Link, NavLink } from 'react-router-dom'
import { deviceSizes } from '../../pages/styled'

const MenuList = styled.ul`
  padding: 0;
  margin: 0;
  list-style-type: none;
  display: flex;
  justify-content: center;
  ${({ theme }) => theme.mediaWidth.upToSmall`{
    min-width: 100%;
    display: flex;
  }`}
`

const MenuListItem = styled.li`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20%;
  padding: 10px 0;
  background-color: #202635;
  color: white;
  text-decoration: none;
  border-radius: 0;
  &:not(:first-of-type) {
    border-left: 1px solid #2c313f;
  }
  &:first-of-type {
    border-radius: 8px 0 0 8px;
  }
  &:last-of-type {
    border-radius: 0 8px 8px 0;
  }

  ${({ theme }) => theme.mediaWidth.upToSmall`{
    white-space: nowrap;
    width: unset;
    padding: 10px 16px;
    &:first-of-type {
      border-radius: unset;
    }
    &:last-of-type {
      border-radius: unset;
    }
  }`}
`
const MenuListItemIcon = styled.span`
  margin-right: 6px;
  & > svg {
    display: block;
  }
`
const MenuListItemTitle = styled.span`
  font-family: Montserrat;
  line-height: 24px;
`

const infoMenuList = [
  {
    title: 'Pools',
    icon: <Grid size={18}></Grid>,
    link: 'pools',
  },
  {
    title: 'Tokens',
    icon: <StopCircle size={18}></StopCircle>,
    link: 'tokens',
  },
]

export function InfoMenu() {
  return (
    <MenuList>
      {infoMenuList.map((el, i) => (
        <MenuListItem
          as={NavLink}
          to={`/info/${el.link}`}
          activeStyle={{
            background: '#2a87d9',
          }}
          key={i}
        >
          <MenuListItemIcon>{el.icon}</MenuListItemIcon>
          <MenuListItemTitle>{el.title}</MenuListItemTitle>
        </MenuListItem>
      ))}
    </MenuList>
  )
}
