/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.app.test.beans.dto.response.base;

import lombok.Data;

/**
 *
 * @author film_
 * @param <T>
 */
@Data
public class ResponseModelDto<T> {

    private String msgHeader;
    private String msgDetail;
    private T body;
    private boolean result;

    public ResponseModelDto(boolean result) {
        this.result = result;
    }

    public ResponseModelDto(String msgHeader, T body, boolean result) {
        this.msgHeader = msgHeader;
        this.body = body;
        this.result = result;
    }

    public ResponseModelDto(String msgHeader, String msgDetail, T body, boolean result) {
        this.msgHeader = msgHeader;
        this.msgDetail = msgDetail;
        this.body = body;
        this.result = result;
    }
}
