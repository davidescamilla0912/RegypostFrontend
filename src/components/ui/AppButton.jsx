import './ui.css';

function AppButton({
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    className = '',
    ...props
}) {
    return (
        <button
            type={type}
            className={`app-btn app-btn--${variant} app-btn--${size} ${className}`.trim()}
            {...props}
        >
            {children}
        </button>
    );
}

export default AppButton;
