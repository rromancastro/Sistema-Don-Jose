export const NavComponent = ({main = false, children, bgColor = "#fff"}) => {
    return <nav style={{backgroundColor: bgColor}} className={main ? "main-nav" : ""}>
        {children}
    </nav>
}