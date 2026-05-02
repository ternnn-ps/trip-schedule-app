/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.app.test.utils;

import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 *
 * @author film_
 */
public final class Utils {

    public static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("dd/MM/yyyy", Locale.US);

    public static final SimpleDateFormat DATETIME_FORMAT = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.US);

    public static final DecimalFormat DEFAULT_DECIMAL_FORMAT = new DecimalFormat("#,##0.00");

    public static final Date truncateMillisecond(Date date) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(date);
        calendar.set(Calendar.MILLISECOND, 0);

        return calendar.getTime();
    }

    public static final String formatDateTimeToString(Date date) {
        String dateString = null;
        if (date != null) {
            dateString = DATETIME_FORMAT.format(date);
        }
        return dateString;
    }

    public static final String formatDateToString(Date date) {
        String dateString = null;
        if (date != null) {
            dateString = DATE_FORMAT.format(date);
        }
        return dateString;
    }

    public static final Date parseStringToDate(String dateString) throws ParseException {
        Date date = null;
        if (StringUtils.isNotBlank(dateString)) {
            date = DATE_FORMAT.parse(dateString);
        }

        return date;
    }

    public static final BigDecimal parseStringToBigDecimal(String string) throws ParseException {
        BigDecimal result = null;
        if (StringUtils.isNotBlank(string)) {
            if (!DEFAULT_DECIMAL_FORMAT.isParseBigDecimal()) {
                DEFAULT_DECIMAL_FORMAT.setParseBigDecimal(true);
            }
            result = (BigDecimal) DEFAULT_DECIMAL_FORMAT.parse(string);
        }

        return result;
    }

    public static <E> Page<E> returnPagedList(Pageable pageable, List<E> listOfEntities) {
        List<E> listToReturn = listOfEntities;
        if (pageable.isPaged()) {
            int pageSize = pageable.getPageSize();
            int currentPage = pageable.getPageNumber();
            int startItem = currentPage * pageSize;
            if (listOfEntities.size() < startItem) {
                listToReturn = Collections.emptyList();
            } else {
                int toIndex = Math.min(startItem + pageSize, listOfEntities.size());
                listToReturn = listOfEntities.subList(startItem, toIndex);
            }
        }
        return new PageImpl<>(listToReturn, pageable, listOfEntities.size());
    }
}
