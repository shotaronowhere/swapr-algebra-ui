import { readableColor } from "polished";
import { PropsWithChildren } from "react";
import styled, { DefaultTheme } from "styled-components/macro";
import { Color } from "theme/styled";

export enum BadgeVariant {
    DEFAULT = "DEFAULT",
    NEGATIVE = "NEGATIVE",
    POSITIVE = "POSITIVE",
    PRIMARY = "PRIMARY",
    WARNING = "WARNING",
    WARNING_OUTLINE = "WARNING_OUTLINE",
}

interface BadgeProps {
    variant?: BadgeVariant;
    className?: string;
}

function pickBackgroundColor(variant: BadgeVariant | undefined, theme: DefaultTheme): Color {
    switch (variant) {
        case BadgeVariant.NEGATIVE:
            return theme.error;
        case BadgeVariant.POSITIVE:
            return "#02365e";
        case BadgeVariant.PRIMARY:
            return "#02365e";
        case BadgeVariant.WARNING:
            return theme.warning;
        case BadgeVariant.WARNING_OUTLINE:
            return "transparent";
        default:
            return "#02365e";
    }
}

function pickBorder(variant: BadgeVariant | undefined, theme: DefaultTheme): string {
    switch (variant) {
        case BadgeVariant.WARNING_OUTLINE:
            return `1px solid ${theme.warning}`;
        default:
            return "unset";
    }
}

function pickFontColor(variant: BadgeVariant | undefined, theme: DefaultTheme): string {
    switch (variant) {
        case BadgeVariant.NEGATIVE:
            return readableColor(theme.error);
        case BadgeVariant.POSITIVE:
            return readableColor(theme.success);
        case BadgeVariant.WARNING:
            return readableColor(theme.warning);
        case BadgeVariant.WARNING_OUTLINE:
            return theme.warning;
        default:
            return readableColor(theme.bg2);
    }
}

const Badge = styled.div<PropsWithChildren<BadgeProps>>`
    align-items: center;
    background-color: ${({ theme, variant }) => pickBackgroundColor(variant, theme)};
    border: ${({ theme, variant }) => pickBorder(variant, theme)};
    border-radius: 0.5rem;
    color: ${({ theme, variant }) => pickFontColor(variant, theme)};
    display: inline-flex;
    padding: 4px 6px;
    justify-content: center;
    font-weight: 500;
    user-select: none;
    cursor: default;
`;

export default Badge;
